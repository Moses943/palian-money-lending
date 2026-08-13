/**
 * Palian Money Lending — Automatic Backup receiver.
 *
 * Deploy this bound to palianml2023@gmail.com (script.google.com, while
 * logged into that account). It receives a POST with the full dataset
 * after every save, writes one tab per table into the target Google Sheet,
 * and drops a timestamped raw JSON snapshot into a Drive backup folder.
 *
 * SETUP:
 * 1. Go to https://script.google.com while logged into palianml2023@gmail.com
 * 2. New project → paste this whole file in as Code.gs
 * 3. Edit the CONFIG block below: paste your Sheet ID and pick a shared secret.
 * 4. Deploy → New deployment → type: "Web app"
 *      - Execute as: Me (palianml2023@gmail.com)
 *      - Who has access: Anyone
 * 5. Copy the Web App URL it gives you — you'll paste it into Vercel as
 *    GDRIVE_BACKUP_URL, and the secret as GDRIVE_BACKUP_SECRET.
 * 6. First run: open the deployed URL once in a browser and approve the
 *    permissions prompt (Sheets + Drive access) — one-time.
 */

// ── CONFIG ──────────────────────────────────────────────────────────────
const SHEET_ID = "1RvgkdjcgM64LlbM9iiSEiVjSGwlO2tegeL4fAF6PiGI"; // from your Sheet link
const BACKUP_FOLDER_NAME = "Palian Auto Backups";               // Drive folder, auto-created if missing
const SHARED_SECRET = "CHANGE_ME_TO_A_LONG_RANDOM_STRING";       // must match GDRIVE_BACKUP_SECRET in Vercel
const MAX_JSON_SNAPSHOTS_KEPT = 300; // rotate old JSON files beyond this count so Drive doesn't fill up

// ── ENTRY POINT ─────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SHARED_SECRET) {
      return jsonOut({ ok: false, error: "unauthorized" });
    }
    const tables = body.tables || {};
    const ss = SpreadsheetApp.openById(SHEET_ID);

    Object.keys(tables).forEach(function (tableName) {
      writeTableToSheet(ss, tableName, tables[tableName]);
    });

    saveJsonSnapshot(tables, body.timestamp);

    return jsonOut({ ok: true, tablesWritten: Object.keys(tables).length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  // Lets you open the URL once in a browser to trigger the permissions prompt.
  return ContentService.createTextOutput("Palian backup endpoint is live.");
}

// ── SHEET TABS ───────────────────────────────────────────────────────────
function writeTableToSheet(ss, tableName, rows) {
  const safeName = tableName.substring(0, 90); // sheet tab name limit
  let sheet = ss.getSheetByName(safeName);
  if (!sheet) sheet = ss.insertSheet(safeName);
  sheet.clearContents();

  if (!rows || !rows.length) {
    sheet.getRange(1, 1).setValue("(no data)");
    return;
  }

  const headers = Object.keys(rows[0]);
  const data = rows.map(function (row) {
    return headers.map(function (h) {
      const v = row[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    });
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (data.length) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
  sheet.setFrozenRows(1);
}

// ── RAW JSON SNAPSHOTS IN DRIVE ─────────────────────────────────────────
function getOrCreateBackupFolder() {
  const existing = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

function saveJsonSnapshot(tables, timestamp) {
  const folder = getOrCreateBackupFolder();
  const ts = (timestamp || new Date().toISOString()).replace(/[:.]/g, "-");
  const filename = "Palian_Backup_" + ts + ".json";
  folder.createFile(filename, JSON.stringify(tables), MimeType.PLAIN_TEXT);
  rotateOldSnapshots(folder);
}

function rotateOldSnapshots(folder) {
  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  const list = [];
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().indexOf("Palian_Backup_") === 0) {
      list.push(f);
    }
  }
  if (list.length <= MAX_JSON_SNAPSHOTS_KEPT) return;
  list.sort(function (a, b) { return a.getDateCreated() - b.getDateCreated(); });
  const toDelete = list.length - MAX_JSON_SNAPSHOTS_KEPT;
  for (let i = 0; i < toDelete; i++) {
    list[i].setTrashed(true);
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
