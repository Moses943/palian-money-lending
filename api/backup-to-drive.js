// /api/backup-to-drive.js
// Vercel serverless function. Triggered after every save (debounced) from
// app.js -- but the payload it sends is NOT the client's data. It reads
// every table straight from Supabase using the service-role key (full
// read access, server-only, never shipped to the browser) so the backup
// always reflects what's actually persisted, not just what's in a tab's
// local memory. Forwards the result to the Apps Script Web App bound to
// palianml2023@gmail.com, which writes it into the Sheet + a Drive JSON
// snapshot.
//
// Requires these Vercel Project Environment Variables:
//   SUPABASE_URL              - same project URL the app uses
//   SUPABASE_SERVICE_ROLE_KEY - Settings -> API -> service_role key.
//                                SERVER-ONLY. Never expose this to the
//                                browser or reuse it as the client anon key.
//   GDRIVE_BACKUP_URL         - the Apps Script "Web app" deployment URL
//   GDRIVE_BACKUP_SECRET      - must match SHARED_SECRET in the Apps Script

import { createClient } from "@supabase/supabase-js";

// Every table in the schema -- mirrored as-is (already snake_case, matches
// what should show up as Sheet columns).
const TABLES = [
  "staff", "clients", "loans", "payments", "leave_requests", "login_logs",
  "branch_funds", "consultant_funds", "bank_account", "daily_reports",
  "payment_plans", "messages", "message_reads", "salary_grades",
  "parcels", "route_prices", "payroll_budget", "statutory_obligations",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GDRIVE_BACKUP_URL, GDRIVE_BACKUP_SECRET } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("backup-to-drive: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    res.status(500).json({ ok: false, error: "Supabase not configured on server" });
    return;
  }
  if (!GDRIVE_BACKUP_URL || !GDRIVE_BACKUP_SECRET) {
    console.error("backup-to-drive: missing GDRIVE_BACKUP_URL / GDRIVE_BACKUP_SECRET");
    res.status(500).json({ ok: false, error: "Backup destination not configured on server" });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Pull every table in parallel, straight from Supabase.
    const results = await Promise.all(
      TABLES.map((t) => supabase.from(t).select("*").then((r) => ({ table: t, ...r })))
    );

    const tables = {};
    const readErrors = [];
    for (const r of results) {
      if (r.error) {
        readErrors.push(`${r.table}: ${r.error.message}`);
        continue;
      }
      tables[r.table] = r.data || [];
    }

    const payload = {
      secret: GDRIVE_BACKUP_SECRET,
      timestamp: new Date().toISOString(),
      tables,
    };

    const upstream = await fetch(GDRIVE_BACKUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000), // Apps Script cold starts can be slow
    });

    const text = await upstream.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    if (!upstream.ok || parsed.ok === false) {
      console.error("backup-to-drive: upstream error", parsed);
      res.status(502).json({ ok: false, error: parsed.error || "Upstream backup failed", readErrors });
      return;
    }

    if (readErrors.length) console.warn("backup-to-drive: some tables failed to read", readErrors);

    res.status(200).json({ ok: true, tablesWritten: Object.keys(tables).length, readErrors });
  } catch (err) {
    console.error("backup-to-drive: request failed", err);
    res.status(500).json({ ok: false, error: err.message || "Backup request failed" });
  }
}
