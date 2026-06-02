const fs = require("fs");
const path = require("path");

function readEnv() {
  // Try multiple candidate locations (script dir, parent, repo root)
  const candidates = [
    path.join(__dirname, ".env.local"),
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", "..", ".env.local"),
  ];
  let envPath = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }
  if (!envPath)
    throw new Error(".env.local not found in repository root or script folder");
  const envContent = fs.readFileSync(envPath, "utf8");
  const env = {};
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2]
        .trim()
        .replace(/^\"|\"$/g, "")
        .replace(/^\'|\'$/g, "");
    }
  });
  return env;
}

async function run() {
  try {
    const env = readEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey)
      throw new Error("Missing Supabase env vars in .env.local");

    const whRes = await fetch(
      `${supabaseUrl}/rest/v1/md_warehouses?select=id,code,name&code=eq.WH-HALU-01`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    const whData = await whRes.json();
    if (!whData || whData.length === 0) {
      console.log("Warehouse WH-HALU-01 not found");
      return;
    }
    const whId = whData[0].id;
    console.log("Found WH id:", whId, "name:", whData[0].name);

    const tuRes = await fetch(
      `${supabaseUrl}/rest/v1/tenant_users?select=id,user_id,full_name,warehouse_id,is_active,role_code,sbu_id&warehouse_id=eq.${whId}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    const tuData = await tuRes.json();
    if (!tuData || tuData.length === 0) {
      console.log("No tenant_users assigned to WH-HALU-01");
      return;
    }
    console.log("tenant_users assigned to WH-HALU-01:");
    tuData.forEach((t) => console.log(JSON.stringify(t)));
  } catch (err) {
    console.error("Error:", err.message || err);
  }
}

run();
