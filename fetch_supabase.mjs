import fs from "fs";
import { parse } from "dotenv";

const envStr = fs.readFileSync(".env.local", "utf-8");
const env = parse(envStr);

async function run() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/job_tracking?job_order_id=eq.cd7de854-5065-4f33-b64b-7fefb5987d2b&order=created_at.desc&limit=5`;
  const res = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));

  const url2 = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/job_orders?id=eq.cd7de854-5065-4f33-b64b-7fefb5987d2b&select=status`;
  const res2 = await fetch(url2, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  const data2 = await res2.json();
  console.log("JO STATUS:", data2);
}
run();
