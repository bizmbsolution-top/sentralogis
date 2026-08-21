import fs from "fs";
import pg from "pg";

// ---- load .env.local ----
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}
const cs = env.DATABASE_URL;
if (!cs) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(cs) ? false : { rejectUnauthorized: false },
});
await client.connect();

const q = async (text) => {
  const rows = (await client.query(text)).rows;
  // Normalize postgres arrays that arrive as raw "{a,b}" strings
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (typeof v === "string" && v.startsWith("{") && v.endsWith("}")) {
        row[k] = v.length === 2 ? [] : v.slice(1, -1).split(",").map((s) => s.replace(/^"(.*)"$/, "$1"));
      }
    }
  }
  return rows;
};

// ---- introspection ----
const enums = await q(`
  SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname ORDER BY t.typname`);

const relations = await q(`
  SELECT c.relname AS name,
         CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'view' ELSE 'table' END AS kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
  ORDER BY c.relname`);

const columns = await q(`
  SELECT c.relname AS table_name,
         a.attname AS column_name,
         format_type(a.atttypid, a.atttypmod) AS data_type,
         NOT a.attnotnull AS is_nullable,
         COALESCE((SELECT true FROM pg_attrdef d WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum), false) AS has_default,
         COALESCE(a.attidentity, '') <> '' AS is_identity,
         COALESCE(a.attgenerated, '') <> '' AS is_generated
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m') AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`);

const fks = await q(`
  SELECT con.conname AS fk_name,
         src.relname AS table_name,
         tgt.relname AS ref_table,
         array_agg(srca.attname ORDER BY sk.ord) AS cols,
         array_agg(tgta.attname ORDER BY tk.ord) AS ref_cols
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace n ON n.oid = src.relnamespace
  CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS sk(attnum, ord)
  JOIN pg_attribute srca ON srca.attrelid = src.oid AND srca.attnum = sk.attnum
  JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tk(attnum, ord) ON tk.ord = sk.ord
  JOIN pg_attribute tgta ON tgta.attrelid = tgt.oid AND tgta.attnum = tk.attnum
  WHERE n.nspname = 'public' AND con.contype = 'f'
  GROUP BY con.conname, src.relname, tgt.relname
  ORDER BY src.relname, con.conname`);

const uniques = await q(`
  SELECT src.relname AS table_name, array_agg(a.attname ORDER BY k.ord) AS cols
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = src.relnamespace
  CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
  JOIN pg_attribute a ON a.attrelid = src.oid AND a.attnum = k.attnum
  WHERE n.nspname = 'public' AND con.contype IN ('u','p')
  GROUP BY src.relname, con.conname`);

const functions = await q(`
  SELECT p.proname AS name,
    to_json(p.proargnames) AS argnames,
    to_json(p.proargmodes) AS argmodes,
    COALESCE(
      (SELECT array_agg(x::regtype::text) FROM unnest(p.proallargtypes) x),
      (SELECT array_agg(x::regtype::text) FROM unnest(p.proargtypes) x)
    ) AS argtypes,
    pg_get_function_result(p.oid) AS result,
    COALESCE(p.proretset, false) AS retset
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
  ORDER BY p.proname`);

// Dedupe overloaded functions (same proname, different signatures) â€” the
// supabase-js Database shape requires unique keys per function name.
const seenFnNames = new Set();
const uniqueFunctions = functions.filter((f) => {
  if (seenFnNames.has(f.name)) return false;
  seenFnNames.add(f.name);
  return true;
});

await client.end();

// ---- type mapping ----
const STRING_TYPES = new Set([
  "character varying", "character", "text", "uuid", "citext", "date",
  "timestamp without time zone", "timestamp with time zone",
  "time without time zone", "time with time zone", "interval",
  "inet", "cidr", "macaddr", "macaddr8", "xml", "bytea", "money", "bpchar",
]);
const NUMBER_TYPES = new Set([
  "smallint", "integer", "bigint", "numeric", "real", "double precision",
]);
const enumNames = new Map(enums.map((e) => [e.name, e.labels]));
const unmappedTypes = new Set();
const relNames = new Set(relations.map((r) => r.name));

function mapType(t) {
  let base = t;
  let arr = "";
  while (base.endsWith("[]")) {
    arr += "[]";
    base = base.slice(0, -2);
  }
  // strip typmods: numeric(15,2) -> numeric, character varying(50) -> character varying
  base = base.replace(/\([^()]*\)\s*$/, "").trim();
  let ts;
  if (base === "boolean") ts = "boolean";
  else if (NUMBER_TYPES.has(base)) ts = "number";
  else if (base === "json" || base === "jsonb") ts = "Json";
  else if (STRING_TYPES.has(base)) ts = "string";
  else if (enumNames.has(base)) {
    const labels = enumNames.get(base);
    ts = labels.map((l) => JSON.stringify(l).replace(/\\\\/g, "\\")).join(" | ");
  } else {
    unmappedTypes.add(base);
    ts = "unknown";
  }
  return ts + arr;
}

function splitTop(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const esc = (s) => JSON.stringify(s);

// group columns per relation
const colsByRel = new Map();
for (const c of columns) {
  if (!colsByRel.has(c.table_name)) colsByRel.set(c.table_name, []);
  colsByRel.get(c.table_name).push(c);
}
// unique sets per table for isOneToOne detection
const uniqByTable = new Map();
for (const u of uniques) {
  if (!uniqByTable.has(u.table_name)) uniqByTable.set(u.table_name, []);
  uniqByTable.get(u.table_name).push([...u.cols].sort().join(","));
}
// FKs grouped per source table
const fksByTable = new Map();
for (const f of fks) {
  if (!fksByTable.has(f.table_name)) fksByTable.set(f.table_name, []);
  const sortedCols = [...f.cols].sort().join(",");
  const oneToOne =
    f.cols.length === 1 &&
    (uniqByTable.get(f.table_name) || []).includes(sortedCols);
  fksByTable.get(f.table_name).push({
    foreignKeyName: f.fk_name,
    columns: f.cols,
    isOneToOne: oneToOne,
    referencedRelation: f.ref_table,
    referencedColumns: f.ref_cols,
  });
}

const relEntry = (rels) =>
  rels.length === 0
    ? "Relationships: []"
    : `Relationships: [\n${rels
        .map(
          (r) =>
            `          {\n            foreignKeyName: ${esc(r.foreignKeyName)};\n            columns: [${r.columns
              .map(esc)
              .join(", ")}];\n            isOneToOne: ${r.isOneToOne};\n            referencedRelation: ${esc(
              r.referencedRelation
            )};\n            referencedColumns: [${r.referencedColumns
              .map(esc)
              .join(", ")}];\n          }`
        )
        .join(",\n")}\n        ]`;

const rowBlock = (cols, indent) =>
  cols
    .map((c) => {
      const t = mapType(c.data_type);
      return `${indent}${esc(c.column_name)}: ${c.is_nullable ? `${t} | null` : t};`;
    })
    .join("\n");

const insertBlock = (cols, indent, kind) =>
  cols
    .map((c) => {
      const t = mapType(c.data_type);
      const valType = c.is_nullable ? `${t} | null` : t;
      const required =
        kind === "table" &&
        !c.is_nullable &&
        !c.has_default &&
        !c.is_identity &&
        !c.is_generated;
      return `${indent}${esc(c.column_name)}${required ? "" : "?"}: ${valType};`;
    })
    .join("\n");

const updateBlock = (cols, indent) =>
  cols
    .map((c) => {
      const t = mapType(c.data_type);
      return `${indent}${esc(c.column_name)}?: ${c.is_nullable ? `${t} | null` : t};`;
    })
    .join("\n");

// ---- emit ----
const L = [];
L.push(`/**`);
L.push(` * Database schema types for the public schema.`);
L.push(` * GENERATED from the live database via scripts-introspection (pg_catalog).`);
L.push(` * Format: @supabase/supabase-js v2 Database shape (with Relationships).`);
L.push(` * Do not hand-edit; regenerate instead.`);
L.push(` */`);
L.push(``);
L.push(`export type Json =`);
L.push(`  | string`);
L.push(`  | number`);
L.push(`  | boolean`);
L.push(`  | null`);
L.push(`  | { [key: string]: Json | undefined }`);
L.push(`  | Json[];`);
L.push(``);
L.push(`export interface Database {`);
L.push(`  public: {`);
L.push(`    Tables: {`);
for (const rel of relations.filter((r) => r.kind === "table")) {
  const cols = colsByRel.get(rel.name) || [];
  const rels = fksByTable.get(rel.name) || [];
  L.push(`      ${esc(rel.name)}: {`);
  L.push(`        Row: {`);
  L.push(rowBlock(cols, "          "));
  L.push(`        };`);
  L.push(`        Insert: {`);
  L.push(insertBlock(cols, "          ", "table"));
  L.push(`        };`);
  L.push(`        Update: {`);
  L.push(updateBlock(cols, "          "));
  L.push(`        };`);
  L.push(`        ${relEntry(rels)};`);
  L.push(`      };`);
}
L.push(`    };`);
L.push(`    Views: {`);
for (const rel of relations.filter((r) => r.kind === "view")) {
  const cols = colsByRel.get(rel.name) || [];
  const rels = fksByTable.get(rel.name) || [];
  L.push(`      ${esc(rel.name)}: {`);
  L.push(`        Row: {`);
  L.push(rowBlock(cols, "          "));
  L.push(`        };`);
  L.push(`        ${relEntry(rels)};`);
  L.push(`      };`);
}
L.push(`    };`);
L.push(`    Functions: {`);
for (const fn of uniqueFunctions) {
  if (fn.result === "trigger") continue;
  // Args
  const names = fn.argnames || [];
  const modes = fn.argmodes || [];
  const types = fn.argtypes || [];
  const args = [];
  if (modes.length === 0) {
    for (let i = 0; i < Math.min(names.length, types.length); i++) {
      if (names[i]) args.push([names[i], types[i]]);
    }
  } else {
    for (let i = 0; i < Math.min(names.length, types.length); i++) {
      if (names[i] && (modes[i] === "i" || modes[i] === "b"))
        args.push([names[i], types[i]]);
    }
  }
  // Returns
  const resultBase = fn.result.replace(/^SETOF\s+/i, "");
  let returns;
  if (fn.result === "void") returns = "undefined";
  else if (fn.retset && relNames.has(resultBase))
    returns = `${resultBase}_Row[]`;
  else if (fn.result.startsWith("TABLE(")) {
    const inner = fn.result.slice("TABLE(".length, -1);
    const fields = splitTop(inner)
      .map((f) => {
        const idx = f.indexOf(" ");
        if (idx < 0) return null;
        const cname = f.slice(0, idx).trim();
        const ctype = f.slice(idx + 1).trim();
        return `${esc(cname)}: ${mapType(ctype)} | null`;
      })
      .filter(Boolean);
    returns = `{ ${fields.join("; ")} }${fn.retset ? "[]" : ""}`;
  } else returns = mapType(fn.result) + (fn.retset ? "[]" : "");

  L.push(`      ${esc(fn.name)}: {`);
  L.push(`        Args: {`);
  L.push(args.map(([n, t]) => `          ${esc(n)}: ${mapType(t)};`).join("\n"));
  L.push(`        };`);
  L.push(`        Returns: ${returns};`);
  L.push(`      };`);
}
L.push(`    };`);
L.push(`    Enums: {`);
for (const e of enums) {
  const labels = e.labels.map((l) => JSON.stringify(l)).join(" | ");
  L.push(`      ${esc(e.name)}: ${labels};`);
}
L.push(`    };`);
L.push(`    CompositeTypes: Record<string, never>;`);
L.push(`  };`);
L.push(`}`);
L.push(``);
L.push(`export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];`);
L.push(``);
for (const rel of relations) {
  const scope = rel.kind === "table" ? "Tables" : "Views";
  L.push(
    `export type ${rel.name}_Row = Database["public"]["${scope}"][${esc(
      rel.name
    )}]["Row"];`
  );
}
L.push(``);

fs.writeFileSync(
  process.argv[2] || "generated-database.types.ts",
  L.join("\n"),
  "utf8"
);

console.log(`tables: ${relations.filter((r) => r.kind === "table").length}`);
console.log(`views: ${relations.filter((r) => r.kind === "view").length}`);
console.log(`functions: ${uniqueFunctions.filter((f) => f.result !== "trigger").length}`);
console.log(`enums: ${enums.length}`);
console.log(`fk relationships: ${fks.length}`);
console.log(`unmapped types: ${[...unmappedTypes].join(", ") || "(none)"}`);
