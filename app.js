"use strict";
const { useState, useRef, useEffect } = React;
const PROVINCES = {
    "Central": { code: "CE", towns: [["Kabwe", "KBW"], ["Kapiri Mposhi", "KAP"], ["Mkushi", "MKU"], ["Mumbwa", "MUM"], ["Chibombo", "CHB"], ["Serenje", "SER"]] },
    "Copperbelt": { code: "CB", towns: [["Kitwe", "KIT"], ["Ndola", "NDL"], ["Mufulira", "MUF"], ["Chingola", "CHG"], ["Chililabombwe", "CLB"], ["Luanshya", "LUA"], ["Kalulushi", "KAL"]] },
    "Eastern": { code: "EA", towns: [["Chipata", "CHP"], ["Petauke", "PET"], ["Katete", "KAT"], ["Lundazi", "LUN"], ["Chadiza", "CHD"], ["Nyimba", "NYI"]] },
    "Luapula": { code: "LU", towns: [["Mansa", "MAN"], ["Kawambwa", "KAW"], ["Samfya", "SAM"], ["Nchelenge", "NCH"], ["Milenge", "MIL"], ["Mwense", "MWE"]] },
    "Lusaka": { code: "LS", towns: [["Lusaka", "LUS"], ["Kafue", "KAF"], ["Chongwe", "CHO"], ["Luangwa", "LWA"], ["Chilanga", "CHL"]] },
    "Muchinga": { code: "MC", towns: [["Chinsali", "CHN"], ["Mpika", "MPK"], ["Nakonde", "NAK"], ["Isoka", "ISO"], ["Mafinga", "MAF"]] },
    "North-Western": { code: "NW", towns: [["Solwezi", "SOL"], ["Kasempa", "KAS"], ["Mwinilunga", "MWI"], ["Zambezi", "ZBZ"], ["Kabompo", "KAB"]] },
    "Northern": { code: "NO", towns: [["Kasama", "KSM"], ["Mbala", "MBA"], ["Mpulungu", "MPU"], ["Mungwi", "MGW"], ["Kaputa", "KPT"], ["Luwingu", "LUW"]] },
    "Southern": { code: "SO", towns: [["Livingstone", "LIV"], ["Choma", "CHM"], ["Mazabuka", "MAZ"], ["Monze", "MON"], ["Kalomo", "KLM"], ["Siavonga", "SIA"]] },
    "Western": { code: "WE", towns: [["Mongu", "MNG"], ["Senanga", "SEN"], ["Kaoma", "KAO"], ["Sesheke", "SES"], ["Lukulu", "LUK"], ["Shangombo", "SHA"]] },
};
function buildTI() { const i = {}; Object.entries(PROVINCES).forEach(([p, d]) => { d.towns.forEach(([t, c]) => { i[t] = { province: p, provinceCode: d.code, townCode: c }; }); }); return i; }
const TI = buildTI();
function gBI(town) { return TI[town] || { province: "—", provinceCode: "HO", townCode: "HOQ" }; }
const HO_ROLES = ["admin", "ceo", "accounts", "hr", "director", "strategic"];
const C = { navy: "#0F2D5C", blue: "#1565C0", orange: "#FF6F00", amber: "#FFB300", red: "#C62828", green: "#2E7D32", teal: "#00695C", purple: "#6A1B9A", gold: "#F9A825", muted: "#607D8B", light: "#F5F7FA", white: "#FFFFFF", border: "#E0E7EF", text: "#1A2744" };
const SC = { Active: C.green, Overdue: C.orange, Defaulted: C.red, Cleared: C.blue, Pending: C.gold, Rejected: C.muted };
// ── STORAGE (Supabase — shared live database across all branches) ────────────
let MDB = null;
// Filled in by config.js (loaded before this file) — see index.html
const SUPABASE_URL = window.PALIAN_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.PALIAN_SUPABASE_ANON_KEY;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function defDB() { return { clients: [], loans: [], payments: [], staff: [], bankBalance: 0, branchFunds: {}, consultantFunds: {}, consultantTargets: {}, leaveRequests: [], loginLogs: [], dailyReports: [] }; }
async function hashPin(pin) {
    const enc = new TextEncoder().encode(String(pin || ""));
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
// snake_case (database) <-> camelCase (app) field mapping
function staffIn(r) { return { id: r.id, name: r.name, pinHash: r.pin_hash, role: r.role, roleLabel: r.role_label, dept: r.dept, salary: r.salary || 0, startDate: r.start_date || "", branch: r.branch, province: r.province, active: r.active, nrc: r.nrc || "", bank: r.bank || "", accountNo: r.account_no || "", grade: r.grade || "", phone: r.phone || "", email: r.email || "", tpin: r.tpin || "", photoUrl: r.photo_url || "" }; }
function staffOut(s) { return { id: s.id, name: s.name, pin_hash: s.pinHash, role: s.role, role_label: s.roleLabel, dept: s.dept, salary: s.salary || 0, start_date: s.startDate || null, branch: s.branch, province: s.province, active: s.active, nrc: s.nrc || "", bank: s.bank || "", account_no: s.accountNo || "", grade: s.grade || "", phone: s.phone || "", email: s.email || "", tpin: s.tpin || "", photo_url: s.photoUrl || null }; }
function clientIn(r) { return { id: r.id, branch: r.branch, province: r.province, name: r.name, nrc: r.nrc, sex: r.sex, dob: r.dob, phone: r.phone, email: r.email, address: r.address, company: r.company, bank: r.bank, accountNo: r.account_no, bankCode: r.bank_code, tpin: r.tpin, nok_name: r.nok_name, nok_phone: r.nok_phone, nok_relationship: r.nok_relationship, nok_address: r.nok_address, passportPhoto: r.passport_photo, docs: r.docs || {}, regDate: r.reg_date, deletionRequested: r.deletion_requested || false, deletionRequestedBy: r.deletion_requested_by || "", deletionRequestedDate: r.deletion_requested_date || null, deletionReason: r.deletion_reason || "" }; }
function clientOut(c) { return { id: c.id, branch: c.branch, province: c.province, name: c.name, nrc: c.nrc, sex: c.sex, dob: c.dob || null, phone: c.phone, email: c.email, address: c.address, company: c.company, bank: c.bank, account_no: c.accountNo, bank_code: c.bankCode, tpin: c.tpin, nok_name: c.nok_name, nok_phone: c.nok_phone, nok_relationship: c.nok_relationship, nok_address: c.nok_address, passport_photo: c.passportPhoto || null, docs: c.docs || {}, reg_date: c.regDate || null, deletion_requested: c.deletionRequested || false, deletion_requested_by: c.deletionRequestedBy || null, deletion_requested_date: c.deletionRequestedDate || null, deletion_reason: c.deletionReason || null }; }
function loanIn(r) { return { loanNo: r.loan_no, clientId: r.client_id, nrc: r.nrc, name: r.name, branch: r.branch, province: r.province, branchCode: r.branch_code, type: r.type, principal: r.principal, interestRate: r.interest_rate, interest: r.interest, totalDue: r.total_due, period: r.period, appDate: r.app_date, disburseDate: r.disburse_date, dueDate: r.due_date, consultant: r.consultant, consultantId: r.consultant_id, approvalStatus: r.approval_status, approvedBy: r.approved_by, approvedDate: r.approved_date, remarks: r.remarks, collateral: r.collateral, deduction: r.deduction, signedLoanCopy: r.signed_loan_copy }; }
function loanOut(l) { return { loan_no: l.loanNo, client_id: l.clientId, nrc: l.nrc, name: l.name, branch: l.branch, province: l.province, branch_code: l.branchCode, type: l.type, principal: l.principal, interest_rate: l.interestRate, interest: l.interest, total_due: l.totalDue, period: l.period, app_date: l.appDate || null, disburse_date: l.disburseDate || null, due_date: l.dueDate || null, consultant: l.consultant, consultant_id: l.consultantId, approval_status: l.approvalStatus, approved_by: l.approvedBy || null, approved_date: l.approvedDate || null, remarks: l.remarks, collateral: l.collateral || null, deduction: l.deduction || null, signed_loan_copy: l.signedLoanCopy || null }; }
function paymentIn(r) { return { id: r.id, loanNo: r.loan_no, clientId: r.client_id, name: r.name, branch: r.branch, amount: r.amount, date: r.date, method: r.method, recordedBy: r.recorded_by, totalDue: r.total_due, newBalance: r.new_balance }; }
function paymentOut(p) { return { id: p.id, loan_no: p.loanNo, client_id: p.clientId, name: p.name, branch: p.branch, amount: p.amount, date: p.date || null, method: p.method, recorded_by: p.recordedBy, total_due: p.totalDue, new_balance: p.newBalance }; }
function leaveIn(r) { return { id: r.id, staffName: r.staff_name, branch: r.branch, type: r.type, from: r.from_date, to: r.to_date, reason: r.reason, status: r.status, submittedDate: r.submitted_date, approvedBy: r.approved_by }; }
function leaveOut(l) { return { id: l.id, staff_name: l.staffName, branch: l.branch, type: l.type, from_date: l.from || null, to_date: l.to || null, reason: l.reason, status: l.status, submitted_date: l.submittedDate || null, approved_by: l.approvedBy || null }; }
function logIn(r) { return { name: r.name, role: r.role, roleLabel: r.role_label, branch: r.branch, province: r.province, date: r.logged_at ? new Date(r.logged_at).toLocaleDateString("en") : "", time: r.logged_at ? new Date(r.logged_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "" }; }
function dailyReportIn(r){return{id:r.id,consultantId:r.consultant_id,consultantName:r.consultant_name,branch:r.branch,province:r.province,reportDate:r.report_date,clientsSeen:r.clients_seen||0,loanAmount:r.loan_amount||0,notes:r.notes||"",status:r.status,approvedBy:r.approved_by,approvedDate:r.approved_date,submittedAt:r.submitted_at};}
function dailyReportOut(r){return{id:r.id,consultant_id:r.consultantId,consultant_name:r.consultantName,branch:r.branch,province:r.province,report_date:r.reportDate||null,clients_seen:r.clientsSeen||0,loan_amount:r.loanAmount||0,notes:r.notes||"",status:r.status,approved_by:r.approvedBy||null,approved_date:r.approvedDate||null};}
async function loadDB() {
    const [staffR, clientsR, loansR, paymentsR, leaveR, logsR, bfR, cfR, bankR, drR] = await Promise.all([
        sb.from("staff").select("*"),
        sb.from("clients").select("*"),
        sb.from("loans").select("*"),
        sb.from("payments").select("*"),
        sb.from("leave_requests").select("*"),
        sb.from("login_logs").select("*").order("logged_at", { ascending: true }).limit(200),
        sb.from("branch_funds").select("*"),
        sb.from("consultant_funds").select("*"),
        sb.from("bank_account").select("*").eq("id", 1).maybeSingle(),
        sb.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(500),
    ]);
    return {
        staff: (staffR.data || []).map(staffIn),
        clients: (clientsR.data || []).map(clientIn),
        loans: (loansR.data || []).map(loanIn),
        payments: (paymentsR.data || []).map(paymentIn),
        leaveRequests: (leaveR.data || []).map(leaveIn),
        loginLogs: (logsR.data || []).map(logIn),
        branchFunds: Object.fromEntries((bfR.data || []).map(r => [r.branch, r.amount])),
        consultantFunds: Object.fromEntries((cfR.data || []).map(r => [r.staff_id, r.amount])),
        consultantTargets: Object.fromEntries((cfR.data || []).map(r => [r.staff_id, r.target])),
        bankBalance: bankR.data?.balance || 0,
        dailyReports: (drR.data || []).map(dailyReportIn),
    };
}
async function saveDB(db) {
    MDB = db;
    try {
        if (db.staff?.length)
            await sb.from("staff").upsert(db.staff.map(staffOut));
        if (db.clients?.length)
            await sb.from("clients").upsert(db.clients.map(clientOut));
        if (db.loans?.length)
            await sb.from("loans").upsert(db.loans.map(loanOut));
        if (db.payments?.length)
            await sb.from("payments").upsert(db.payments.map(paymentOut));
        if (db.leaveRequests?.length)
            await sb.from("leave_requests").upsert(db.leaveRequests.map(leaveOut));
        if (db.dailyReports?.length)
            await sb.from("daily_reports").upsert(db.dailyReports.map(dailyReportOut));
        const bfRows = Object.entries(db.branchFunds || {}).map(([branch, amount]) => ({ branch, amount }));
        if (bfRows.length)
            await sb.from("branch_funds").upsert(bfRows);
        const cfRows = Object.entries(db.consultantFunds || {}).map(([staff_id, amount]) => ({ staff_id, amount, target: (db.consultantTargets || {})[staff_id] || 0 }));
        if (cfRows.length)
            await sb.from("consultant_funds").upsert(cfRows);
        await sb.from("bank_account").upsert([{ id: 1, balance: db.bankBalance || 0 }]);
    }
    catch (e) {
        console.error("saveDB error", e);
    }
}
async function logLoginToDB(u) {
    try {
        const { data } = await sb.from("login_logs").insert([{ staff_id: u.id, name: u.name, role: u.role, role_label: u.roleLabel, branch: u.branch, province: u.province }]).select("id").single();
        return data?.id || null;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
async function logLogoutToDB(logId) {
    if (!logId)
        return;
    try {
        await sb.from("login_logs").update({ logged_out_at: new Date().toISOString() }).eq("id", logId);
    }
    catch (e) {
        console.error(e);
    }
}
// ── CALCULATIONS ──────────────────────────────────────────────────────────────
const fmt = n => "K " + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split("T")[0];
const pad = (n, l = 4) => String(n).padStart(l, "0");
const validNRC = n => /^\d{6}\/\d{2}\/\d{1}$/.test((n || "").trim());
const isHO = r => HO_ROLES.includes(r);
function getBal(loan, pmts) { return Math.max(0, (loan.totalDue || 0) - pmts.filter(p => p.loanNo === loan.loanNo).reduce((s, p) => s + p.amount, 0)); }
function getSt(loan, pmts) {
    if (loan.approvalStatus === "Pending")
        return "Pending";
    if (loan.approvalStatus === "Rejected")
        return "Rejected";
    if (getBal(loan, pmts) <= 0)
        return "Cleared";
    if (!loan.dueDate)
        return "Active";
    const d = Math.floor((new Date() - new Date(loan.dueDate)) / 86400000);
    if (d >= 30)
        return "Defaulted";
    if (d > 0)
        return "Overdue";
    return "Active";
}
function getDOD(loan) { if (!loan.dueDate)
    return 0; const d = Math.floor((new Date() - new Date(loan.dueDate)) / 86400000); return d > 0 ? d : 0; }
function getPen(loan, pmts) { const d = getDOD(loan), b = getBal(loan, pmts); if (!d || !b)
    return 0; return d <= 3 ? b * 0.1 * d : b * 0.3; }
function getDI(loan, pmts) { if (getSt(loan, pmts) !== "Defaulted")
    return 0; const dod = getDOD(loan); if (dod < 30)
    return 0; return getBal(loan, pmts) * 0.05 * Math.max(1, Math.ceil((dod - 29) / 7)); }
function getTotalOwed(loan, pmts) { const st = getSt(loan, pmts), bal = getBal(loan, pmts); if (st === "Defaulted")
    return bal + getDI(loan, pmts); if (st === "Overdue")
    return bal + getPen(loan, pmts); return bal; }
function calcPAYE(t) { if (t <= 4800)
    return 0; let x = Math.min(t - 4800, 2100) * 0.25; if (t > 6900)
    x += Math.min(t - 6900, 1200) * 0.30; if (t > 8100)
    x += (t - 8100) * 0.375; return x; }
const bL = ((db, b) => db.loans.filter(l => l.branch === b));
const bP = ((db, b) => db.payments.filter(p => p.branch === b));
const bC = ((db, b) => db.clients.filter(c => c.branch === b));
// ── LOGO ──────────────────────────────────────────────────────────────────────
const PALIAN_LOGO_B64 = "data:image/jpeg;base64," + [
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMU",
  "FRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU",
  "FBQUFBQUFBT/wAARCAEYAOADASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAUBAgQGAwcICf/EAEMQAAEEAQIEAwUEBwUH",
  "BQAAAAEAAgMEBQYRBxIhMRNBYQgiUXGBFDKRoRUjJEJSYrEWM4KSwQklQ1NjcrJzoqOz0f/EABsBAQACAwEBAAAAAAAAAAAAAAAB",
  "AgMFBgQH/8QANBEAAgEDAQYEBAUEAwAAAAAAAAECAwQRIQUGEjFBURMyYYEicbHRBxRCkaEVI1LwouHx/9oADAMBAAIRAxEAPwD6",
  "poiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiA",
  "IiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAI",
  "iIAiIgCIiAIiIAiIgCIqbhAVRU3CbhAVRU3CbhAVRU3CbhAVRU3CbhAVRU3CbhAVRU3CbhAVRU3CbhAVRU3Cb7oCqIiAIiIAiIgC",
  "IiAIiICh7K1XHsrVZFWERFJATfZYN3LRVZBC0OnskbtgiG7vmfgPU7Lg+y5C/wBbE4qR/wDKrHd31ef9B9VGSyj1ZnWb1em3eeeO",
  "EHtzuA/qsQZ+vISIGz2PWKFxH47bLlq4anTeHxwN8T/mP955/wAR3KzAAFGpPwojzlZiN2Y228fJjfyLgn6VlaN5MdbYP+1rv/Fx",
  "UjtsiYYyuxGjP1Gu5ZjJWP8A14nMH4kbfms2CzDZZzwyslZ/Ew7hcnKD5LBsYOnO/wAQReBN38WAmN34jv8AVNR8LM9FFObkcf1a",
  "4ZCEfuu2ZKB6Hs767fNZVLJwXg4RuIkb0fE8cr2H1BU5Iceplom6KSoVW91RVb3UMkuREVSwREQBERAEREAREQFD2VquPZWlWRVg",
  "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"
].join("");
const HERO_PHOTO = "data:image/jpeg;base64,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";
const FOUNDER_SKETCH = "data:image/jpeg;base64,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";
function PalianLogo({ size = 60 }) { return (React.createElement("img", { src: PALIAN_LOGO_B64, alt: "Palian Money Lending", style: { width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" } })); }
const LSVG = `<img src="${PALIAN_LOGO_B64}" alt="Palian Money Lending" style="width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;"/>`;
// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function Badge({ s }) { return React.createElement("span", { style: { background: SC[s] || "#888", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" } }, s); }
function Btn({ children, onClick, color, sm, full, disabled, style }) { return React.createElement("button", { onClick: onClick, disabled: disabled, style: { background: disabled ? "#ccc" : (color || C.navy), color: "#fff", border: "none", borderRadius: 8, padding: sm ? "7px 14px" : "11px 22px", fontWeight: 700, fontSize: sm ? 12 : 13, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : undefined, boxShadow: disabled ? "none" : "0 2px 6px rgba(0,0,0,0.12)", ...style } }, children); }
function GBtn({ children, onClick, style }) { return React.createElement("button", { onClick: onClick, style: { background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", color: C.text, ...style } }, children); }
function Card({ children, style }) { return React.createElement("div", { style: { background: C.white, borderRadius: 14, padding: 20, boxShadow: "0 4px 16px rgba(15,45,92,0.10)", marginBottom: 16, ...style } }, children); }
function ST({ children, color }) { return React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.navy, borderLeft: `4px solid ${color || C.orange}`, paddingLeft: 10, marginBottom: 14 } }, children); }
function IR({ label, value, bold, color }) { return React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 } },
    React.createElement("span", { style: { color: C.muted } }, label),
    React.createElement("span", { style: { fontWeight: bold ? 800 : 600, color: color || (bold ? C.navy : C.text) } }, value)); }
function Alrt({ type, children }) { const m = { info: { bg: "#E3F2FD", b: C.blue, c: C.navy }, warn: { bg: "#FFF8E1", b: C.amber, c: "#5D4037" }, error: { bg: "#FFEBEE", b: C.red, c: C.red }, success: { bg: "#E8F5E9", b: C.green, c: C.green } }; const s = m[type || "info"]; return React.createElement("div", { style: { background: s.bg, border: `1.5px solid ${s.b}`, color: s.c, borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12 } }, children); }
const iSt = { width: "100%", padding: "11px 13px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", background: "#FAFBFD" };
function Inp({ label, req, note, ...p }) { return React.createElement("div", { style: { marginBottom: 12 } },
    label && React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 } },
        label,
        req && React.createElement("span", { style: { color: C.red } }, " *")),
    React.createElement("input", { style: iSt, ...p }),
    note && React.createElement("div", { style: { fontSize: 10, color: C.muted, marginTop: 3 } }, note)); }
function Sel({ label, req, children, ...p }) { return React.createElement("div", { style: { marginBottom: 12 } },
    label && React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 } },
        label,
        req && React.createElement("span", { style: { color: C.red } }, " *")),
    React.createElement("select", { style: iSt, ...p }, children)); }
function StatCard({ label, value, color, icon, small }) { return React.createElement("div", { style: { background: C.white, borderRadius: 12, padding: "14px 10px", textAlign: "center", borderTop: `4px solid ${color || C.navy}`, boxShadow: "0 2px 8px rgba(15,45,92,0.08)" } },
    icon && React.createElement("div", { style: { fontSize: 20, marginBottom: 3 } }, icon),
    React.createElement("div", { style: { fontSize: small ? 11 : 20, fontWeight: 800, color: color || C.navy, lineHeight: 1.2 } }, value),
    React.createElement("div", { style: { fontSize: 10, color: C.muted, fontWeight: 700, marginTop: 3 } }, label)); }
function ProvinceTownSelect({ province, town, onProvince, onTown, required }) {
    const towns = province ? PROVINCES[province]?.towns || [] : [];
    const info = town ? gBI(town) : null;
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
            React.createElement(Sel, { label: "Province", req: required, value: province || "", onChange: e => onProvince(e.target.value) },
                React.createElement("option", { value: "" }, "-- Province --"),
                Object.keys(PROVINCES).map(p => React.createElement("option", { key: p }, p))),
            React.createElement(Sel, { label: "Town/Branch", req: required, value: town || "", onChange: e => onTown(e.target.value), disabled: !province },
                React.createElement("option", { value: "" }, "-- Town --"),
                towns.map(([t]) => React.createElement("option", { key: t }, t)))),
        info && town && React.createElement("div", { style: { fontSize: 11, color: C.muted, marginTop: -6, marginBottom: 10 } },
            "Branch Code: ",
            React.createElement("strong", { style: { color: C.teal } },
                info.provinceCode,
                "-",
                info.townCode))));
}
function PhotoUpload({ label, value, onChange, small }) {
    const ref = useRef();
    const [busy, setBusy] = useState(false);
    function handle(e) { const f = e.target.files[0]; if (!f)
        return; setBusy(true); const r = new FileReader(); r.onload = ev => { try {
        const img = new Image();
        img.onload = () => { const canvas = document.createElement("canvas"); const MAX = 280; let w = img.width, h = img.height; if (w > MAX) {
            h = Math.round(h * MAX / w);
            w = MAX;
        } if (h > MAX) {
            w = Math.round(w * MAX / h);
            h = MAX;
        } canvas.width = w; canvas.height = h; canvas.getContext("2d").drawImage(img, 0, 0, w, h); onChange(canvas.toDataURL("image/jpeg", 0.45)); setBusy(false); };
        img.onerror = () => { onChange(ev.target.result); setBusy(false); };
        img.src = ev.target.result;
    }
    catch {
        onChange(ev.target.result);
        setBusy(false);
    } }; r.onerror = () => setBusy(false); r.readAsDataURL(f); }
    const sz = small ? 52 : 72;
    return (React.createElement("div", { style: { marginBottom: 14 } },
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 } }, label),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
            React.createElement("div", { onClick: () => ref.current.click(), style: { width: sz, height: sz, borderRadius: 10, border: `2px dashed ${value ? C.green : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: C.light, flexShrink: 0 } }, busy ? React.createElement("div", { style: { fontSize: 10, color: C.muted } }, "...") : value ? React.createElement("img", { src: value, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" } }) : React.createElement("div", { style: { fontSize: small ? 18 : 26 } }, "\uD83D\uDCF7")),
            React.createElement("div", null,
                React.createElement(Btn, { sm: true, color: C.blue, onClick: () => ref.current.click() },
                    "\uD83D\uDCC1 ",
                    value ? "Change" : "Upload"),
                value && React.createElement(React.Fragment, null,
                    React.createElement("div", { style: { fontSize: 11, color: C.green, marginTop: 6, fontWeight: 700 } }, "\u2705 Done"),
                    React.createElement("button", { onClick: () => onChange(null), style: { background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", padding: 0, marginTop: 2 } }, "Remove")))),
        React.createElement("input", { ref: ref, type: "file", accept: "image/*,application/pdf", style: { display: "none" }, onChange: handle })));
}
function DIBadge({ loan, pmts }) { const di = getDI(loan, pmts); if (!di)
    return null; const dod = getDOD(loan), periods = Math.max(1, Math.ceil((dod - 29) / 7)); return (React.createElement("div", { style: { background: "#FFF3E0", border: `1.5px solid ${C.orange}`, borderRadius: 9, padding: "9px 12px", marginBottom: 8 } },
    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.red, marginBottom: 3 } }, "\uD83D\uDCC8 Default Interest (5% per 7 days auto)"),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 } }, [["Days OD", dod], ["Periods", periods], ["Default Int.", fmt(di)]].map(([l, v]) => React.createElement("div", { key: l },
        React.createElement("div", { style: { color: C.muted, fontWeight: 600 } }, l),
        React.createElement("div", { style: { fontWeight: 700, color: C.red } }, v)))),
    React.createElement("div", { style: { marginTop: 6, fontWeight: 700, fontSize: 12, color: C.navy } },
        "Total Owed: ",
        React.createElement("span", { style: { color: C.red } }, fmt(getTotalOwed(loan, pmts)))))); }
// ── CLEARANCE CERTIFICATE (print window) ──────────────────────────────────────
function openClearanceCert(loan, client, db) {
    const paid = db.payments.filter(p => p.loanNo === loan.loanNo).reduce((s, p) => s + p.amount, 0);
    const clearDate = db.payments.filter(p => p.loanNo === loan.loanNo).slice(-1)[0]?.date || today();
    const kf = n => "K " + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sms = `Dear ${client?.name || loan.name}, your loan ${loan.loanNo} with Palian Money Lending Ltd has been FULLY CLEARED on ${clearDate}. Total paid: ${kf(paid)}. Cert No: CLR-${loan.loanNo}. ${loan.branch} Branch.`;
    const w = window.open("", "_blank", "width=700,height=950");
    if (!w) {
        alert("Certificate could not open. Please allow popups or use the Print button inside the app.");
        return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>Clearance Certificate</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:36px;max-width:620px;margin:0 auto;color:#1A2744}.hdr{text-align:center;border-bottom:3px solid #0F2D5C;padding-bottom:18px;margin-bottom:22px}.co{font-size:19px;font-weight:900;color:#0F2D5C;margin:7px 0 2px}.ct{font-size:15px;font-weight:800;color:#FF6F00;margin:10px 0 3px;text-transform:uppercase;letter-spacing:1px}.cn{font-size:11px;color:#888}.st{font-size:11px;font-weight:700;color:#0F2D5C;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px;border-left:4px solid #FF6F00;padding-left:9px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0f4f8;font-size:13px}.lb{color:#888}.vl{font-weight:700}.cb{background:#E8F5E9;border:2px solid #2E7D32;border-radius:12px;padding:16px;text-align:center;margin:20px 0}.stmt{font-size:13px;color:#444;line-height:1.8;margin:18px 0;padding:14px;background:#F5F7FA;border-radius:10px;border-left:4px solid #2E7D32}.sga{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:40px}.sg{text-align:center}.sl{border-top:1.5px solid #333;margin:44px 0 7px}.slb{font-size:11px;color:#444;font-weight:700}.sms{background:#E3F2FD;border:1.5px solid #1565C0;border-radius:10px;padding:12px;margin-top:16px;font-size:12px;color:#0F2D5C;line-height:1.7}.ft{text-align:center;font-size:10px;color:#aaa;margin-top:24px;padding-top:14px;border-top:1px dashed #ddd;line-height:1.8}.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:82px;font-weight:900;color:rgba(46,125,50,0.05);pointer-events:none}@media print{.np{display:none!important}}</style></head><body>
  <div class="wm">CLEARED</div>
  <div class="hdr">${LSVG}<div class="co">PALIAN MONEY LENDING LIMITED</div><div style="font-size:11px;color:#888">Microfinance Services — All 10 Provinces of Zambia</div><div class="ct">🎉 Loan Clearance Certificate</div><div class="cn">Cert No: <strong>CLR-${loan.loanNo}</strong> | Issued: <strong>${clearDate}</strong> | Branch: <strong>${loan.branch}, ${loan.province}</strong></div></div>
  <div class="st">Client Details</div>
  <div class="row"><span class="lb">Full Name</span><span class="vl">${client?.name || loan.name}</span></div>
  <div class="row"><span class="lb">NRC Number</span><span class="vl">${client?.nrc || loan.nrc}</span></div>
  <div class="row"><span class="lb">Phone</span><span class="vl">${client?.phone || "—"}</span></div>
  <div class="row"><span class="lb">Address</span><span class="vl">${client?.address || "—"}</span></div>
  <div class="row"><span class="lb">Next of Kin</span><span class="vl">${client?.nok_name || "—"}${client?.nok_relationship ? " (" + client.nok_relationship + ")" : ""}</span></div>
  <div class="st">Loan Details</div>
  <div class="row"><span class="lb">Loan No.</span><span class="vl">${loan.loanNo}</span></div>
  <div class="row"><span class="lb">Type / Period</span><span class="vl">${loan.type} · ${loan.period || "—"}</span></div>
  <div class="row"><span class="lb">Principal</span><span class="vl">${kf(loan.principal)}</span></div>
  <div class="row"><span class="lb">Interest (${(loan.interestRate * 100).toFixed(0)}%)</span><span class="vl">${kf(loan.interest)}</span></div>
  <div class="row"><span class="lb">Total Due</span><span class="vl">${kf(loan.totalDue)}</span></div>
  <div class="row"><span class="lb">Total Paid</span><span class="vl" style="color:#2E7D32">${kf(paid)}</span></div>
  <div class="row"><span class="lb">Date Cleared</span><span class="vl" style="color:#2E7D32"><strong>${clearDate}</strong></span></div>
  <div class="row"><span class="lb">Loan Officer</span><span class="vl">${loan.consultant}</span></div>
  <div class="cb"><div style="font-size:34px">✅</div><div style="font-size:15px;font-weight:800;color:#2E7D32;margin-top:6px">LOAN FULLY CLEARED — ZERO BALANCE OUTSTANDING</div></div>
  <div class="stmt">This certifies that <strong>${client?.name || loan.name}</strong> (NRC: ${client?.nrc || loan.nrc}) has fully repaid loan <strong>${loan.loanNo}</strong> issued by Palian Money Lending Limited, ${loan.branch} Branch. As of <strong>${clearDate}</strong>, there are no outstanding obligations. This client is eligible for a new loan.</div>
  <div class="sms"><strong style="color:#1565C0">📱 SMS/WhatsApp:</strong><br><span id="s">${sms}</span><br><br><button class="np" onclick="navigator.clipboard.writeText(document.getElementById('s').innerText).then(()=>alert('✅ Copied!'))" style="padding:7px 14px;background:#1565C0;color:#fff;border:none;border-radius:7px;font-size:12px;cursor:pointer;font-weight:700;margin-top:4px;">📋 Copy SMS</button></div>
  <div class="sga"><div class="sg"><div class="sl"></div><div class="slb">LOAN OFFICER / CONSULTANT</div><div style="font-size:11px;color:#888;margin-top:3px">${loan.consultant}</div></div><div class="sg"><div class="sl"></div><div class="slb">AUTHORIZED SIGNATORY</div><div style="font-size:11px;color:#888;margin-top:3px">Branch Manager — ${loan.branch}</div></div></div>
  <div class="ft">Palian Money Lending Limited · Licensed Microfinance Institution, Zambia<br>Cert Ref: CLR-${loan.loanNo} · Generated: ${new Date().toLocaleString()}</div>
  <br><button class="np" onclick="window.print()" style="width:100%;padding:14px;background:#0F2D5C;color:#fff;border:none;border-radius:10px;font-size:15px;cursor:pointer;font-weight:800;margin-top:10px;">🖨️ Print / Save as PDF</button>
  </body></html>`);
    w.document.close();
}
// ── PAYSLIP (print window) ────────────────────────────────────────────────────
function openPayslip(staff, opts) {
    const basic = staff.salary || 0, house = opts.houseAllowance || 0, transport = opts.transport || 0, other = opts.other || 0;
    const total = basic + house + transport + other;
    const napsa = +(total * 0.05).toFixed(2);
    const paye = +calcPAYE(Math.max(0, total - napsa)).toFixed(2);
    const net = +(total - napsa - paye).toFixed(2);
    const kf = n => Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mName = months[(opts.month || 1) - 1];
    const incR = [["Basic Salary", kf(basic)], ...(house > 0 ? [["House Allowance", kf(house)]] : []), ...(transport > 0 ? [["Transport Allowance", kf(transport)]] : []), ...(other > 0 ? [["Other Income", kf(other)]] : [])];
    const dedR = [["NAPSA (5%)", kf(napsa)], ["PAYE (Estimated)", kf(paye)]];
    const maxR = Math.max(incR.length, dedR.length);
    let tRows = "";
    for (let i = 0; i < maxR; i++) {
        const inc = incR[i] || ["", ""];
        const ded = dedR[i] || ["", ""];
        tRows += `<tr><td>${inc[0]}</td><td class="a">${inc[1]}</td><td>${ded[0]}</td><td class="a">${ded[1]}</td></tr>`;
    }
    const w = window.open("", "_blank", "width=720,height=960");
    if (!w)
        return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip — ${staff.name}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;padding:30px;color:#1A2744;max-width:680px;margin:0 auto}.hdr{text-align:center;background:#0F2D5C;color:#fff;padding:16px}.hdr-co{font-size:17px;font-weight:900;letter-spacing:1px;margin:6px 0 2px}.hdr-ps{font-size:13px;font-weight:700;color:#FFB300;letter-spacing:2px;margin:3px 0}.hdr-ct{font-size:10px;color:rgba(255,255,255,0.7)}.period{background:#FF6F00;color:#fff;text-align:center;padding:7px;font-weight:800;font-size:11px;letter-spacing:1.5px}.emp{width:100%;border-collapse:collapse;border:1.5px solid #0F2D5C}.emp td{padding:6px 8px;border:1px solid #ccc;font-size:11px}.emp .l{background:#F5F7FA;font-weight:700;color:#0F2D5C;width:14%}.pay{width:100%;border-collapse:collapse;border:1.5px solid #0F2D5C}.pay th{background:#0F2D5C;color:#fff;padding:8px;text-align:left;font-size:11px}.pay .a{text-align:right}.pay td{padding:7px 8px;border-bottom:1px solid #eee;font-size:12px}.pay tr:nth-child(even) td{background:#FAFBFD}.tot td{background:#E8F5E9;font-weight:800;border-top:2px solid #0F2D5C}.sm{background:#0F2D5C;color:#fff;padding:10px 14px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px}.si{text-align:center}.sl{font-size:9px;opacity:.7;text-transform:uppercase;letter-spacing:.5px}.sv{font-size:12px;font-weight:800;color:#FFB300}.np2{background:#2E7D32;color:#fff;padding:14px;text-align:center}.nl{font-size:11px;opacity:.8;letter-spacing:1px}.na{font-size:24px;font-weight:900}.ft{text-align:center;font-size:10px;color:#888;margin-top:16px;border-top:1px dashed #ccc;padding-top:12px;line-height:1.7}@media print{.np{display:none!important}}</style></head><body>
  <div class="hdr"><div style="margin-bottom:6px">${LSVG}</div><div class="hdr-co">PALIAN MONEY LENDING LIMITED</div><div class="hdr-ps">PAY STATEMENT</div><div class="hdr-ct">Chingola | Kasama • palian2023@gmail.com • 0977 903 111 / +260 976 767 627</div></div>
  <div class="period">PAY PERIOD: ${mName.toUpperCase()} ${opts.year}</div>
  <table class="emp"><tr><td class="l">EMP NAME</td><td colspan="3">${staff.name.toUpperCase()}</td><td class="l">EMP NO.</td><td>${staff.id}</td><td class="l">NRC NO.</td><td>${staff.nrc || "—"}</td></tr>
  <tr><td class="l">ENG. DATE</td><td>${staff.startDate || "—"}</td><td class="l">JOB TITLE</td><td>${(staff.roleLabel || staff.role).toUpperCase()}</td><td class="l">BANK</td><td colspan="3">${staff.bank || "—"}</td></tr>
  <tr><td class="l">PROVINCE</td><td>${staff.province || "—"}</td><td class="l">BRANCH</td><td>${staff.branch || "—"}</td><td class="l">GRADE/PT</td><td>${staff.grade || staff.dept || "—"}</td><td class="l">CURRENCY</td><td>ZMW</td></tr></table>
  <table class="pay"><thead><tr><th>Description (INCOMES)</th><th class="a">Amount (K)</th><th>Description (DEDUCTIONS)</th><th class="a">Amount (K)</th></tr></thead>
  <tbody>${tRows}<tr class="tot"><td>TOTAL INCOME</td><td class="a">${kf(total)}</td><td>TOTAL DEDUCTIONS</td><td class="a">${kf(napsa + paye)}</td></tr></tbody></table>
  <div class="sm"><div class="si"><div class="sl">Taxable</div><div class="sv">${kf(Math.max(0, total - napsa))}</div></div><div class="si"><div class="sl">Leave Days</div><div class="sv">${opts.leaveDays || 0}</div></div><div class="si"><div class="sl">Gross YTD</div><div class="sv">${kf(basic * 12)}</div></div><div class="si"><div class="sl">Xmas Bonus</div><div class="sv">${kf(opts.xmasBonus || 0)}</div></div></div>
  <div class="np2"><div class="nl">NET PAY (BANK TRANSFER)</div><div class="na">K ${kf(net)}</div></div>
  <div class="ft">Computer-generated payslip. No signature required.<br>Palian Money Lending Limited — Licensed Microfinance Institution, Zambia · ${new Date().toLocaleString()}</div>
  <br><button class="np" onclick="window.print()" style="width:100%;padding:15px;background:#0F2D5C;color:#fff;border:none;border-radius:10px;font-size:15px;cursor:pointer;font-weight:800;margin-top:10px;">🖨️ Print / Save as PDF</button>
  </body></html>`);
    w.document.close();
}
// ── REPORT PDF GENERATION + UPLOAD (real files, not just print) ──────────────
function buildFinancialReportPDF(loan, client, db) {
    const paid = db.payments.filter(p => p.loanNo === loan.loanNo).reduce((s, p) => s + p.amount, 0);
    const bal = getBal(loan, db.payments);
    const dod = getDOD(loan);
    const st = getSt(loan, db.payments);
    const di = getDI(loan, db.payments);
    const pen = getPen(loan, db.payments);
    const totalOwed = bal + (st === "Defaulted" ? di : pen);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 18;
    const line = (label, value, bold) => { doc.setFont(undefined, bold ? "bold" : "normal"); doc.setFontSize(10); doc.text(String(label), 14, y); doc.text(String(value), 120, y); y += 7; };
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    doc.text("PALIAN MONEY LENDING LIMITED", 14, y);
    y += 7;
    doc.setFontSize(11);
    doc.setTextColor(255, 111, 0);
    doc.text("Financial Report", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(`Date of Report: ${today()}  |  Ref: FIN-${loan.loanNo}`, 14, y);
    y += 10;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Client Information", 14, y);
    y += 8;
    line("Client Name", client?.name || loan.name);
    line("Client ID", client?.id || "—");
    line("NRC Number", client?.nrc || loan.nrc);
    line("Loan Consultant", loan.consultant);
    line("Phone Number", client?.phone || "—");
    y += 3;
    doc.setFont(undefined, "bold");
    doc.text("Loan Details", 14, y);
    y += 8;
    line("Loan Type", loan.type);
    line("Loan Reference Number", loan.loanNo);
    line("Branch / Province", `${loan.branch}, ${loan.province}`);
    line("Due Date", loan.dueDate || "—");
    line("Status", st);
    y += 3;
    doc.setFont(undefined, "bold");
    doc.text("Financial Summary", 14, y);
    y += 8;
    line("Initial Loan Amount", fmt(loan.principal));
    line(`Interest (${(loan.interestRate * 100).toFixed(0)}%)`, fmt(loan.interest));
    line("Total Amount Agreed", fmt(loan.totalDue));
    line("Total Amount Paid", fmt(paid));
    line("Outstanding Balance", fmt(bal));
    line("Days Late", dod > 0 ? `${dod} days` : "Not overdue");
    if (st === "Defaulted")
        line("Default Interest", fmt(di));
    if (st === "Overdue")
        line("Penalty Charge", fmt(pen));
    y += 2;
    doc.setDrawColor(255, 179, 0);
    doc.line(14, y, 196, y);
    y += 8;
    line("TOTAL AMOUNT DUE", fmt(totalOwed), true);
    y += 10;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.setTextColor(140);
    doc.text(`Palian Money Lending Limited · Licensed Microfinance Institution, Zambia`, 14, y);
    y += 5;
    doc.text(`Report Ref: FIN-${loan.loanNo} · Generated: ${new Date().toLocaleString()}`, 14, y);
    return doc;
}
async function uploadReportPDF(loan, client, db) {
    const doc = buildFinancialReportPDF(loan, client, db);
    const blob = doc.output("blob");
    const path = `financial-reports/${loan.loanNo}-${Date.now()}.pdf`;
    const { error } = await sb.storage.from("reports").upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (error)
        throw error;
    const { data } = sb.storage.from("reports").getPublicUrl(path);
    return data.publicUrl;
}
function downloadFinancialReportPDF(loan, client, db) {
    const doc = buildFinancialReportPDF(loan, client, db);
    doc.save(`Financial-Report-${loan.loanNo}.pdf`);
}
function buildClearancePDF(loan, client, db) {
    const paid = db.payments.filter(p => p.loanNo === loan.loanNo).reduce((s, p) => s + p.amount, 0);
    const clearDate = db.payments.filter(p => p.loanNo === loan.loanNo).slice(-1)[0]?.date || today();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 18;
    const line = (label, value, bold) => { doc.setFont(undefined, bold ? "bold" : "normal"); doc.setFontSize(10); doc.text(String(label), 14, y); doc.text(String(value), 120, y); y += 7; };
    doc.setFontSize(15); doc.setFont(undefined, "bold");
    doc.text("PALIAN MONEY LENDING LIMITED", 14, y); y += 7;
    doc.setFontSize(12); doc.setTextColor(255, 111, 0);
    doc.text("LOAN CLEARANCE CERTIFICATE", 14, y); doc.setTextColor(0, 0, 0); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    doc.text(`Cert No: CLR-${loan.loanNo}  |  Issued: ${clearDate}  |  Branch: ${loan.branch}, ${loan.province}`, 14, y); y += 10;
    doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("Client Details", 14, y); y += 8;
    line("Full Name", client?.name || loan.name);
    line("NRC Number", client?.nrc || loan.nrc);
    line("Phone", client?.phone || "—");
    line("Address", client?.address || "—");
    y += 3;
    doc.setFont(undefined, "bold"); doc.text("Loan Details", 14, y); y += 8;
    line("Loan No.", loan.loanNo);
    line("Type / Period", `${loan.type} · ${loan.period || "—"}`);
    line("Principal", fmt(loan.principal));
    line(`Interest (${(loan.interestRate * 100).toFixed(0)}%)`, fmt(loan.interest));
    line("Total Due", fmt(loan.totalDue));
    line("Total Paid", fmt(paid));
    line("Date Cleared", clearDate, true);
    line("Loan Officer", loan.consultant);
    y += 4;
    doc.setFillColor(232, 245, 233); doc.rect(14, y, 182, 20, "F");
    doc.setTextColor(46, 125, 50); doc.setFont(undefined, "bold"); doc.setFontSize(12);
    doc.text("LOAN FULLY CLEARED — ZERO BALANCE OUTSTANDING", 20, y + 12);
    doc.setTextColor(0, 0, 0); y += 30;
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    const stmt = `This certifies that ${client?.name || loan.name} (NRC: ${client?.nrc || loan.nrc}) has fully repaid loan ${loan.loanNo} issued by Palian Money Lending Limited, ${loan.branch} Branch. As of ${clearDate}, there are no outstanding obligations. This client is eligible for a new loan.`;
    const wrapped = doc.splitTextToSize(stmt, 182);
    doc.text(wrapped, 14, y); y += wrapped.length * 5 + 15;
    doc.setDrawColor(50); doc.line(14, y, 80, y); doc.line(116, y, 182, y);
    doc.setFontSize(8);
    doc.text("LOAN OFFICER / CONSULTANT", 14, y + 5); doc.text(loan.consultant, 14, y + 10);
    doc.text("AUTHORIZED SIGNATORY", 116, y + 5); doc.text(`Branch Manager — ${loan.branch}`, 116, y + 10);
    y += 20;
    doc.setTextColor(140); doc.text(`Cert Ref: CLR-${loan.loanNo} · Generated: ${new Date().toLocaleString()}`, 14, y);
    return doc;
}
function downloadClearancePDF(loan, client, db) {
    const doc = buildClearancePDF(loan, client, db);
    doc.save(`Clearance-Certificate-${loan.loanNo}.pdf`);
}
function buildPayslipPDF(staff, opts) {
    const basic = staff.salary || 0, house = opts.houseAllowance || 0, transport = opts.transport || 0, other = opts.other || 0;
    const total = basic + house + transport + other;
    const napsa = +(total * 0.05).toFixed(2);
    const paye = +calcPAYE(Math.max(0, total - napsa)).toFixed(2);
    const net = +(total - napsa - paye).toFixed(2);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mName = months[(opts.month || 1) - 1];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(15); doc.setFont(undefined, "bold");
    doc.text("PALIAN MONEY LENDING LIMITED", 14, y); y += 7;
    doc.setFontSize(11); doc.setTextColor(255, 179, 0);
    doc.text("PAY STATEMENT", 14, y); doc.setTextColor(0, 0, 0); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    doc.text(`Pay Period: ${mName.toUpperCase()} ${opts.year}`, 14, y); y += 10;
    doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;
    const line = (label, value, bold) => { doc.setFont(undefined, bold ? "bold" : "normal"); doc.setFontSize(10); doc.text(String(label), 14, y); doc.text(String(value), 120, y); y += 7; };
    line("Employee Name", staff.name.toUpperCase());
    line("Employee No.", staff.id);
    line("NRC No.", staff.nrc || "—");
    line("Job Title", (staff.roleLabel || staff.role).toUpperCase());
    line("Branch", staff.branch || "—");
    line("Bank", staff.bank || "—");
    y += 3;
    doc.setFont(undefined, "bold"); doc.text("Earnings", 14, y); y += 8;
    line("Basic Salary", fmt(basic));
    if (house > 0) line("House Allowance", fmt(house));
    if (transport > 0) line("Transport Allowance", fmt(transport));
    if (other > 0) line("Other Income", fmt(other));
    y += 3;
    doc.setFont(undefined, "bold"); doc.text("Deductions", 14, y); y += 8;
    line("NAPSA (5%)", fmt(napsa));
    line("PAYE (Estimated)", fmt(paye));
    y += 2; doc.setDrawColor(255, 179, 0); doc.line(14, y, 196, y); y += 10;
    doc.setFillColor(232, 245, 233); doc.rect(14, y, 182, 16, "F");
    doc.setFont(undefined, "bold"); doc.setFontSize(12); doc.setTextColor(46, 125, 50);
    doc.text(`NET PAY: ${fmt(net)}`, 20, y + 10);
    doc.setTextColor(0, 0, 0); y += 26;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(140);
    doc.text("Computer-generated payslip. No signature required.", 14, y); y += 5;
    doc.text(`Palian Money Lending Limited · Generated: ${new Date().toLocaleString()}`, 14, y);
    return doc;
}
function downloadPayslipPDF(staff, opts) {
    const doc = buildPayslipPDF(staff, opts);
    doc.save(`Payslip-${staff.name.replace(/\s+/g, "-")}-${opts.month}-${opts.year}.pdf`);
}
function FinancialReportView({ loan, client, db, onClose }) {
    const [uploading, setUploading] = useState(false);
    const [uploadUrl, setUploadUrl] = useState(null);
    const [uploadErr, setUploadErr] = useState("");
    async function doUpload() {
        setUploading(true);
        setUploadErr("");
        try {
            const url = await uploadReportPDF(loan, client, db);
            setUploadUrl(url);
        }
        catch (e) {
            setUploadErr(e.message || "Upload failed. Check the 'reports' storage bucket exists.");
        }
        setUploading(false);
    }
    const paid = db.payments.filter(p => p.loanNo === loan.loanNo).reduce((s, p) => s + p.amount, 0);
    const bal = getBal(loan, db.payments);
    const dod = getDOD(loan);
    const st = getSt(loan, db.payments);
    const di = getDI(loan, db.payments);
    const pen = getPen(loan, db.payments);
    const penAmt = st === "Defaulted" ? di : pen;
    const totalOwed = bal + penAmt;
    const stColor = st === "Cleared" ? C.green : st === "Defaulted" || st === "Overdue" ? C.red : C.blue;
    const periods = Math.max(1, Math.ceil((dod - 29) / 7));
    return (React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.88)", zIndex: 2000, overflowY: "auto" } },
        React.createElement("div", { style: { background: "#fff", maxWidth: 640, margin: "0 auto", minHeight: "100vh" } },
            React.createElement("div", { style: { background: C.navy, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 } },
                React.createElement("div", { style: { color: "#fff", fontWeight: 800, fontSize: 14 } }, "\uD83D\uDCCB Financial Report"),
                React.createElement("div", { style: { display: "flex", gap: 8 } },
                    React.createElement(Btn, { sm: true, color: C.gold, onClick: doUpload, disabled: uploading }, uploading ? "⏳..." : "☁️ Upload"),
                    React.createElement(Btn, { sm: true, color: C.blue, onClick: () => downloadFinancialReportPDF(loan, client, db) }, "\u2B07\uFE0F Download"),
                    React.createElement(Btn, { sm: true, color: C.teal, onClick: () => window.print() }, "\uD83D\uDDA8\uFE0F Print"),
                    React.createElement(Btn, { sm: true, color: C.red, onClick: onClose }, "\u2715 Close"))),
            (uploadUrl || uploadErr) && (React.createElement("div", { style: { padding: "12px 20px 0" } },
                uploadUrl && React.createElement(Alrt, { type: "success" },
                    "\u2705 Uploaded! Shareable link:",
                    React.createElement("br", null),
                    React.createElement("a", { href: uploadUrl, target: "_blank", rel: "noreferrer", style: { color: C.blue, wordBreak: "break-all" } }, uploadUrl),
                    React.createElement("div", { style: { marginTop: 8 } },
                        React.createElement(Btn, { sm: true, color: C.blue, onClick: () => { navigator.clipboard?.writeText(uploadUrl); alert("Link copied!"); } }, "\uD83D\uDCCB Copy Link"))),
                uploadErr && React.createElement(Alrt, { type: "error" },
                    "\u274C ",
                    uploadErr))),
            React.createElement("div", { style: { padding: 20 } },
                React.createElement("div", { style: { textAlign: "center", borderBottom: `3px solid ${C.navy}`, paddingBottom: 16, marginBottom: 20 } },
                    React.createElement(PalianLogo, { size: 56 }),
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 18, color: C.navy, marginTop: 8 } }, "PALIAN MONEY LENDING LIMITED"),
                    React.createElement("div", { style: { fontSize: 15, fontWeight: 800, color: C.orange, marginTop: 6, textTransform: "uppercase", letterSpacing: 1 } }, "Financial Report"),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted, marginTop: 4 } },
                        "Date of Report: ",
                        React.createElement("strong", null, today()),
                        " \u00A0|\u00A0 Ref: FIN-",
                        loan.loanNo)),
                React.createElement(ST, null, "Client Information"),
                React.createElement(IR, { label: "Client Name", value: client?.name || loan.name }),
                React.createElement(IR, { label: "Client ID", value: client?.id || "—" }),
                React.createElement(IR, { label: "NRC Number", value: client?.nrc || loan.nrc }),
                React.createElement(IR, { label: "Loan Consultant", value: loan.consultant }),
                React.createElement(IR, { label: "Address", value: client?.address || "—" }),
                React.createElement(IR, { label: "Phone Number", value: client?.phone || "—" }),
                React.createElement(IR, { label: "Email", value: client?.email || "—" }),
                React.createElement(IR, { label: "Account Number", value: `${client?.accountNo || "—"}${client?.bank ? " (" + client.bank + ")" : ""}` }),
                client?.nok_name && React.createElement(IR, { label: "Next of Kin", value: `${client.nok_name}${client.nok_relationship ? " (" + client.nok_relationship + ")" : ""} ${client.nok_phone ? "· " + client.nok_phone : ""}` }),
                React.createElement("div", { style: { marginTop: 14 } }),
                React.createElement(ST, null, "Loan Details"),
                React.createElement(IR, { label: "Loan Type", value: loan.type }),
                React.createElement(IR, { label: "Loan Issuance Date", value: loan.disburseDate || loan.appDate || "—" }),
                React.createElement(IR, { label: "Loan Reference Number", value: loan.loanNo }),
                React.createElement(IR, { label: "Branch Code", value: loan.branchCode || "—" }),
                React.createElement(IR, { label: "Branch / Province", value: `${loan.branch}, ${loan.province}` }),
                React.createElement(IR, { label: "Period", value: loan.period || "—" }),
                React.createElement(IR, { label: "Due Date", value: loan.dueDate || "—" }),
                React.createElement(IR, { label: "Status", value: st, color: stColor }),
                React.createElement(IR, { label: "Approved By", value: loan.approvedBy || "Pending" }),
                React.createElement("div", { style: { marginTop: 14 } }),
                React.createElement(ST, null, "Financial Summary"),
                React.createElement("div", { style: { background: "#FFF8E1", border: `2px solid ${C.amber}`, borderRadius: 10, padding: 16, marginBottom: 16 } },
                    React.createElement("div", { style: { fontWeight: 800, color: C.navy, marginBottom: 10, fontSize: 13 } },
                        "Financial Summary as at ",
                        today()),
                    React.createElement(IR, { label: "Initial Loan Amount", value: fmt(loan.principal) }),
                    React.createElement(IR, { label: `Interest (${(loan.interestRate * 100).toFixed(0)}%)`, value: fmt(loan.interest) }),
                    React.createElement(IR, { label: "Total Amount Agreed", value: fmt(loan.totalDue) }),
                    React.createElement(IR, { label: "Total Amount Paid", value: fmt(paid), color: C.green }),
                    React.createElement(IR, { label: "Outstanding Balance (Before Charges)", value: fmt(bal) }),
                    React.createElement(IR, { label: "Days Late", value: dod > 0 ? `${dod} days` : "Not overdue", color: dod > 0 ? C.red : C.green }),
                    st === "Defaulted" && React.createElement(IR, { label: `Default Interest (5% × ${periods} × 7-day periods)`, value: fmt(di), color: C.red }),
                    st === "Overdue" && React.createElement(IR, { label: "Penalty Charge", value: fmt(pen), color: C.red }),
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `2px solid ${C.amber}`, marginTop: 10 } },
                        React.createElement("span", { style: { fontWeight: 800, color: C.navy, fontSize: 13 } }, "TOTAL AMOUNT DUE (Including Charges)"),
                        React.createElement("span", { style: { fontSize: 18, fontWeight: 900, color: C.red } }, fmt(totalOwed))),
                    React.createElement("div", { style: { fontSize: 10, color: C.muted, marginTop: 4 } },
                        "Final Reference: FIN-",
                        loan.loanNo,
                        "-",
                        Date.now().toString().slice(-6))),
                React.createElement(ST, null, "Remarks"),
                React.createElement("div", { style: { background: C.light, borderRadius: 8, padding: 14, fontSize: 13, color: "#444", lineHeight: 1.8, marginBottom: 16 } }, st === "Cleared"
                    ? `The loan ${loan.loanNo} has been fully repaid by ${client?.name || loan.name}. No outstanding obligations remain. This client is eligible for a new loan.`
                    : st === "Defaulted"
                        ? `Since the ${loan.type} repayment is ${dod} days overdue, automatic default interest of 5% per 7-day period has been applied, increasing the total outstanding amount to ${fmt(totalOwed)}. Immediate payment is advised to avoid further interest accumulation.`
                        : st === "Overdue"
                            ? `The loan ${loan.loanNo} is ${dod} days overdue. A penalty charge has been applied. Total outstanding: ${fmt(totalOwed)}. Immediate payment is strongly advised.`
                            : `Loan ${loan.loanNo} is currently Active. Outstanding balance: ${fmt(bal)}. Due: ${loan.dueDate || "—"}.`),
                st !== "Cleared" && React.createElement(React.Fragment, null,
                    React.createElement(ST, null, "Recommendations"),
                    React.createElement("div", { style: { fontSize: 13, color: C.text, lineHeight: 2, marginBottom: 16 } },
                        React.createElement("div", null, "\u2022 Urgent payment to avoid additional charges."),
                        React.createElement("div", null,
                            "\u2022 Contact Palian Money Lending Limited or consultant ",
                            React.createElement("strong", null, loan.consultant),
                            " to discuss repayment options."),
                        React.createElement("div", null, "\u2022 Explore financial restructuring or flexible repayment plans for better loan management."))),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 40 } }, [["LOAN OFFICER / CONSULTANT", loan.consultant], ["AUTHORIZED SIGNATORY", `Branch Manager — ${loan.branch}`]].map(([l, s]) => (React.createElement("div", { key: l, style: { textAlign: "center" } },
                    React.createElement("div", { style: { borderTop: `1.5px solid #333`, marginTop: 44, marginBottom: 7 } }),
                    React.createElement("div", { style: { fontSize: 11, color: "#444", fontWeight: 700 } }, l),
                    React.createElement("div", { style: { fontSize: 10, color: C.muted, marginTop: 3 } }, s))))),
                React.createElement("div", { style: { textAlign: "center", fontSize: 10, color: C.muted, marginTop: 28, paddingTop: 14, borderTop: `1px dashed ${C.border}`, lineHeight: 1.8 } },
                    "Palian Money Lending Limited \u00B7 Licensed Microfinance Institution, Zambia",
                    React.createElement("br", null),
                    "Report Ref: FIN-",
                    loan.loanNo,
                    " \u00B7 Generated: ",
                    new Date().toLocaleString())),
            React.createElement("div", { style: { padding: "0 20px 24px" } },
                React.createElement(Btn, { full: true, color: C.navy, onClick: onClose }, "\u2190 Back to App")))));
}
// ── BACKUP & RESTORE ──────────────────────────────────────────────────────────
function BackupRestore({ db, setDb }) {
    const fileRef = useRef();
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const stats = { clients: db.clients.length, loans: db.loans.length, payments: db.payments.length, staff: db.staff.filter(s => s.active).length };
    function dlJSON(data, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })); a.download = name; a.click(); }
    function fullBackup() { try {
        dlJSON(db, `Palian_FULL_Backup_${today()}.json`);
        setStatus("✅ Full backup downloaded! Send it to your WhatsApp or Google Drive immediately.");
    }
    catch (e) {
        setStatus("❌ Error: " + e.message);
    } }
    function dataBackup() {
        try {
            const stripped = { ...db, clients: db.clients.map(c => ({ ...c, passportPhoto: null, docs: {} })), loans: db.loans.map(l => ({ ...l, signedLoanCopy: null, collateral: l.collateral ? { ...l.collateral, photo: null } : undefined })) };
            dlJSON(stripped, `Palian_Data_Backup_${today()}.json`);
            setStatus("✅ Data backup downloaded (photos excluded to keep file small).");
        }
        catch (e) {
            setStatus("❌ Error: " + e.message);
        }
    }
    function csvExport() {
        const rows = [["PALIAN MONEY LENDING — FULL DATA EXPORT", today()], [], ["=== CLIENTS ==="], ["ID", "Name", "NRC", "Phone", "Branch", "Province", "Address", "Employer", "Bank", "Account No.", "TPIN", "NOK Name", "NOK Phone", "NOK Relationship", "Registered"]];
        db.clients.forEach(c => rows.push([c.id, c.name, c.nrc, c.phone, c.branch, c.province, c.address, c.company, c.bank, c.accountNo, c.tpin, c.nok_name, c.nok_phone, c.nok_relationship, c.regDate]));
        rows.push([], ["=== LOANS ==="], ["Loan No.", "Client Name", "NRC", "Branch", "Province", "Type", "Principal", "Int Rate", "Interest", "Total Due", "Paid", "Balance", "Default Interest", "Total Owed", "Status", "Period", "App Date", "Disburse Date", "Due Date", "Consultant", "Approved By"]);
        db.loans.forEach(l => { const paid = db.payments.filter(p => p.loanNo === l.loanNo).reduce((s, p) => s + p.amount, 0); const bal = Math.max(0, l.totalDue - paid); rows.push([l.loanNo, l.name, l.nrc, l.branch, l.province, l.type, l.principal, (l.interestRate * 100).toFixed(0) + "%", l.interest, l.totalDue, paid, bal, getDI(l, db.payments), getTotalOwed(l, db.payments), getSt(l, db.payments), l.period, l.appDate, l.disburseDate, l.dueDate, l.consultant, l.approvedBy]); });
        rows.push([], ["=== PAYMENTS ==="], ["Receipt", "Loan No.", "Client", "Branch", "Amount", "Date", "Method", "Recorded By", "Balance After"]);
        db.payments.forEach(p => rows.push([p.id, p.loanNo, p.name, p.branch, p.amount, p.date, p.method, p.recordedBy, p.newBalance]));
        rows.push([], ["=== STAFF ==="], ["ID", "Name", "Role", "Dept", "Salary", "Branch", "Province", "Start Date", "NRC", "Bank", "Account", "Grade"]);
        db.staff.forEach(s => rows.push([s.id, s.name, s.roleLabel || s.role, s.dept, s.salary, s.branch, s.province, s.startDate, s.nrc, s.bank, s.accountNo, s.grade]));
        rows.push([], ["=== BANK & FUNDS ==="], ["Bank Balance", "Branch", "Fund Amount"]);
        rows.push([db.bankBalance || 0, "", ""]);
        Object.entries(db.branchFunds || {}).forEach(([b, v]) => rows.push(["", b, v]));
        const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = `Palian_Excel_Export_${today()}.csv`;
        a.click();
        setStatus("✅ Excel/CSV downloaded. Open in Excel or Google Sheets.");
    }
    function handleImport(e) {
        const f = e.target.files[0];
        if (!f)
            return;
        setBusy(true);
        const r = new FileReader();
        r.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.clients || !data.loans || !data.staff) {
                    setStatus("❌ Invalid file. Please use a Palian JSON backup file.");
                    setBusy(false);
                    return;
                }
                const msg = `Restore this backup?\n\n• ${data.clients.length} clients\n• ${data.loans.length} loans\n• ${data.payments?.length || 0} payments\n• ${data.staff?.length || 0} staff\n\n⚠️ This REPLACES all current data.`;
                if (window.confirm(msg)) {
                    if (!data.bankBalance)
                        data.bankBalance = 0;
                    if (!data.branchFunds)
                        data.branchFunds = {};
                    if (!data.consultantFunds)
                        data.consultantFunds = {};
                    if (!data.consultantTargets)
                        data.consultantTargets = {};
                    if (!data.leaveRequests)
                        data.leaveRequests = [];
                    if (!data.loginLogs)
                        data.loginLogs = [];
                    saveDB(data);
                    setDb(data);
                    setStatus(`✅ Restored! ${data.clients.length} clients, ${data.loans.length} loans, ${data.payments?.length || 0} payments.`);
                }
                else
                    setStatus("Restore cancelled.");
            }
            catch (err) {
                setStatus("❌ Error reading file: " + err.message);
            }
            setBusy(false);
            e.target.value = "";
        };
        r.readAsText(f);
    }
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, color: "#fff", padding: 18, marginBottom: 14 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 } },
                React.createElement("div", { style: { fontSize: 36 } }, "\uD83D\uDCBE"),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 16 } }, "Backup & Restore"),
                    React.createElement("div", { style: { fontSize: 12, opacity: 0.8 } }, "Protect your data \u2014 back up daily"))),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, [["👥 Clients", stats.clients], ["📋 Loans", stats.loans], ["💳 Payments", stats.payments], ["👤 Active Staff", stats.staff]].map(([l, v]) => (React.createElement("div", { key: l, style: { background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, textAlign: "center" } },
                React.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, v),
                React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, l)))))),
        status && React.createElement(Alrt, { type: status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info" }, status),
        React.createElement(Card, null,
            React.createElement(ST, { color: C.green }, "\uD83D\uDCE4 Download Backup"),
            React.createElement(Alrt, { type: "warn" }, "\u26A0\uFE0F Save your backup immediately after downloading \u2014 send it to WhatsApp, email, or Google Drive so it is never lost."),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
                React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.navy, marginBottom: 4 } }, "\uD83D\uDCE6 Full Backup (Recommended)"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 10 } }, "Everything including photos. Use this to fully restore. File may be large."),
                    React.createElement(Btn, { color: C.green, full: true, onClick: fullBackup }, "\u2B07\uFE0F Download Full Backup (.json)")),
                React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.navy, marginBottom: 4 } }, "\uD83D\uDCCB Data-Only Backup (Smaller)"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 10 } }, "All records without photos \u2014 much smaller file. Good for records backup. Can be restored."),
                    React.createElement(Btn, { color: C.teal, full: true, onClick: dataBackup }, "\u2B07\uFE0F Download Data Backup (no photos)")),
                React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.navy, marginBottom: 4 } }, "\uD83D\uDCCA Excel / CSV Export"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 10 } },
                        "All data in spreadsheet format. Open in Excel or Google Sheets. ",
                        React.createElement("strong", null, "Cannot be used to restore"),
                        " \u2014 for viewing only."),
                    React.createElement(Btn, { color: C.blue, full: true, onClick: csvExport }, "\u2B07\uFE0F Download Excel/CSV (.csv)")))),
        React.createElement(Card, { style: { borderLeft: `4px solid ${C.orange}` } },
            React.createElement(ST, { color: C.orange }, "\uD83D\uDCE5 Restore from Backup"),
            React.createElement(Alrt, { type: "error" },
                "\u26A0\uFE0F IMPORTANT: Restoring will REPLACE all current data with the backup file. Only do this when you have lost data. Only ",
                React.createElement("strong", null, ".json"),
                " backup files can be restored."),
            React.createElement("div", { style: { fontSize: 13, color: C.muted, marginBottom: 14 } },
                "Select a Palian ",
                React.createElement("strong", null, ".json"),
                " backup file to restore your data."),
            React.createElement(Btn, { color: C.orange, full: true, onClick: () => fileRef.current.click(), disabled: busy }, busy ? "⏳ Restoring..." : "📂 Select Backup File to Restore (.json)"),
            React.createElement("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: handleImport })),
        React.createElement(Card, null,
            React.createElement(ST, null, "\uD83D\uDCA1 Backup Guide"),
            React.createElement("div", { style: { fontSize: 13, color: C.text, lineHeight: 2 } },
                React.createElement("div", null,
                    "\uD83D\uDCCC ",
                    React.createElement("strong", null, "When:"),
                    " After registering clients, after recording payments, at end of each day."),
                React.createElement("div", null,
                    "\uD83D\uDCCC ",
                    React.createElement("strong", null, "Where to save:"),
                    " WhatsApp (send to yourself), Email, or Google Drive."),
                React.createElement("div", null,
                    "\uD83D\uDCCC ",
                    React.createElement("strong", null, "To restore:"),
                    " Come to this page \u2192 tap \"Select Backup File\" \u2192 choose your saved .json file."),
                React.createElement("div", null,
                    "\uD83D\uDCCC ",
                    React.createElement("strong", null, "CSV files"),
                    " are for Excel viewing only and cannot restore data."),
                React.createElement("div", null,
                    "\uD83D\uDCCC ",
                    React.createElement("strong", null, "Keep multiple backups"),
                    " \u2014 save one for each week so you can go back in time.")))));
}
// ── PAYSLIP GENERATOR COMPONENT ───────────────────────────────────────────────
/* ── HR LEDGER THEME (scoped to HR module only) ──────────────────────────── */
const HRT = {
    navy950: "#071a30", navy800: "#0e2c4d", navy700: "#153a63",
    gold500: "#c89b3c", garnet700: "#7a1f2b",
    parchment50: "#f7f2e7", parchment100: "#efe7d3",
    ink900: "#1c1f26", ink600: "#4d5360",
    green700: "#2f6b4f", red700: "#8a2b2b", line: "#d8cdb0",
};
const HRF = {
    display: `'Spectral', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    mono: `'IBM Plex Mono', ui-monospace, monospace`,
};
function HRHeading({ eyebrow, title }) {
    return (React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("div", { style: { fontFamily: HRF.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: HRT.gold500 } }, eyebrow),
        React.createElement("div", { style: { fontFamily: HRF.display, fontSize: 21, fontWeight: 600, color: HRT.ink900, marginTop: 2 } }, title)));
}
function HRStatCard({ label, value, sub, accent }) {
    return (React.createElement("div", { style: { background: HRT.navy800, borderRadius: 10, padding: "14px 14px", borderTop: `3px solid ${accent || HRT.gold500}`, minWidth: 0 } },
        React.createElement("div", { style: { fontFamily: HRF.mono, fontSize: 9, color: "#9fb0c6", textTransform: "uppercase", letterSpacing: "0.06em" } }, label),
        React.createElement("div", { style: { fontFamily: HRF.display, fontSize: 24, fontWeight: 600, color: "#fff", marginTop: 4 } }, value),
        sub && React.createElement("div", { style: { fontSize: 11, color: "#9fb0c6", marginTop: 2 } }, sub)));
}
function HRPanel({ title, children, style }) {
    return (React.createElement("div", { style: { background: "#fff", border: `1px solid ${HRT.line}`, borderRadius: 10, padding: 16, marginBottom: 14, ...style } },
        title && React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 15, color: HRT.ink900, marginBottom: 10 } }, title),
        children));
}
function HRBtn({ children, onClick, bg, sm, full, disabled, style }) {
    return (React.createElement("button", { onClick: onClick, disabled: disabled, style: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: disabled ? "#bbb" : (bg || HRT.navy800), color: "#fff", border: "none", borderRadius: 6, padding: sm ? "7px 12px" : "10px 16px", fontFamily: HRF.body, fontSize: sm ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : undefined, ...style } }, children));
}
function HRGBtn({ children, onClick, style }) {
    return (React.createElement("button", { onClick: onClick, style: { background: "none", border: `1px solid ${HRT.line}`, borderRadius: 6, padding: "9px 14px", fontFamily: HRF.body, fontWeight: 600, fontSize: 12, cursor: "pointer", color: HRT.ink900, ...style } }, children));
}
const hrInpStyle = { width: "100%", padding: "9px 10px", border: `1px solid ${HRT.line}`, borderRadius: 6, fontFamily: HRF.body, fontSize: 13, boxSizing: "border-box", background: HRT.parchment50 };
function HRInp({ label, req, note, ...p }) {
    return (React.createElement("div", { style: { marginBottom: 10 } },
        label && React.createElement("div", { style: { fontFamily: HRF.mono, fontSize: 10, color: HRT.ink600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" } },
            label,
            req && React.createElement("span", { style: { color: HRT.garnet700 } }, " *")),
        React.createElement("input", { style: hrInpStyle, ...p }),
        note && React.createElement("div", { style: { fontSize: 10, color: HRT.ink600, marginTop: 3 } }, note)));
}
function HRSel({ label, req, children, ...p }) {
    return (React.createElement("div", { style: { marginBottom: 10 } },
        label && React.createElement("div", { style: { fontFamily: HRF.mono, fontSize: 10, color: HRT.ink600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" } },
            label,
            req && React.createElement("span", { style: { color: HRT.garnet700 } }, " *")),
        React.createElement("select", { style: hrInpStyle, ...p }, children)));
}
function HRBadge({ label, tone }) {
    const toneMap = { approved: { c: HRT.green700 }, pending: { c: HRT.gold500 }, action: { c: HRT.garnet700 } };
    const c = (toneMap[tone] || toneMap.pending).c;
    return (React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontFamily: HRF.mono, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: c, border: `1.5px solid ${c}`, borderRadius: 3, padding: "2px 7px", background: "rgba(255,255,255,0.6)" } }, label));
}
function HRIR({ label, value, bold, mono }) {
    return (React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${HRT.parchment100}`, fontSize: 13 } },
        React.createElement("span", { style: { color: HRT.ink600 } }, label),
        React.createElement("span", { style: { fontFamily: mono ? HRF.mono : HRF.body, fontWeight: bold ? 700 : 500, color: HRT.ink900 } }, value)));
}
function HRRule() { return React.createElement("div", { style: { height: 1, background: HRT.line, margin: "2px 0" } }); }
function HRAlrt({ type, children }) {
    const m = { info: { bg: "#eaf1f7", b: HRT.navy700, c: HRT.navy800 }, warn: { bg: "#faf3e3", b: HRT.gold500, c: "#6b5220" }, error: { bg: "#f7e9e9", b: HRT.garnet700, c: HRT.garnet700 }, success: { bg: "#e9f2ec", b: HRT.green700, c: HRT.green700 } };
    const s = m[type || "info"];
    return (React.createElement("div", { style: { background: s.bg, border: `1px solid ${s.b}`, color: s.c, borderRadius: 6, padding: "10px 12px", fontSize: 12, fontFamily: HRF.body, marginBottom: 10 } }, children));
}
function hrTabBtn(active, onClick, label) {
    return (React.createElement("button", { onClick: onClick, style: { padding: "7px 11px", borderRadius: 6, border: `1px solid ${active ? HRT.gold500 : HRT.line}`, background: active ? HRT.navy800 : "#fff", color: active ? "#fff" : HRT.ink900, fontFamily: HRF.body, fontWeight: 600, fontSize: 11, cursor: "pointer" } }, label));
}
/* ── PAYSLIP GENERATOR (ledger style) ────────────────────────────────────── */
function PayslipGenerator({ db }) {
    const [sel, setSel] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [house, setHouse] = useState("");
    const [transport, setTransport] = useState("");
    const [other, setOther] = useState("");
    const [leave, setLeave] = useState("0");
    const [xmas, setXmas] = useState("0");
    const staff = db.staff.find(s => s.id === sel);
    const basic = staff?.salary || 0;
    const hN = parseFloat(house) || 0;
    const tN = parseFloat(transport) || 0;
    const oN = parseFloat(other) || 0;
    const total = basic + hN + tN + oN;
    const napsa = +(total * 0.05).toFixed(2);
    const paye = +calcPAYE(Math.max(0, total - napsa)).toFixed(2);
    const net = +(total - napsa - paye).toFixed(2);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function generate() { if (!staff) {
        alert("Select a staff member.");
        return;
    } openPayslip(staff, { month: parseInt(month), year: parseInt(year), houseAllowance: hN, transport: tN, other: oN, leaveDays: parseFloat(leave) || 0, xmasBonus: parseFloat(xmas) || 0 }); }
    function generateDownload() { if (!staff) {
        alert("Select a staff member.");
        return;
    } downloadPayslipPDF(staff, { month: parseInt(month), year: parseInt(year), houseAllowance: hN, transport: tN, other: oN }); }
    return (React.createElement(HRPanel, { title: "Generate Payslip" },
        React.createElement(HRAlrt, { type: "info" }, "Ledger-format payslip \u2014 opens for printing, or downloads directly as a PDF."),
        React.createElement(HRSel, { label: "Staff Member", value: sel, onChange: e => setSel(e.target.value) },
            React.createElement("option", { value: "" }, "-- Select Staff --"),
            db.staff.filter(s => s.active).map(s => React.createElement("option", { key: s.id, value: s.id },
                s.name,
                " \u2014 ",
                s.roleLabel || s.role))),
        staff && React.createElement("div", { style: { background: HRT.parchment100, borderRadius: 6, padding: 10, marginBottom: 10 } },
            React.createElement(HRIR, { label: "Basic Salary", value: fmt(basic), mono: true }),
            React.createElement(HRIR, { label: "Branch", value: staff.branch || "—" }),
            React.createElement(HRIR, { label: "Bank", value: staff.bank || "Not set — update in HR" })),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
            React.createElement(HRSel, { label: "Pay Month", value: month, onChange: e => setMonth(e.target.value) }, months.map((m, i) => React.createElement("option", { key: i + 1, value: i + 1 }, m))),
            React.createElement(HRInp, { label: "Year", type: "number", value: year, onChange: e => setYear(e.target.value) }),
            React.createElement(HRInp, { label: "House Allowance (K)", type: "number", value: house, onChange: e => setHouse(e.target.value), placeholder: "0.00" }),
            React.createElement(HRInp, { label: "Transport Allowance (K)", type: "number", value: transport, onChange: e => setTransport(e.target.value), placeholder: "0.00" }),
            React.createElement(HRInp, { label: "Other Income (K)", type: "number", value: other, onChange: e => setOther(e.target.value), placeholder: "0.00" }),
            React.createElement(HRInp, { label: "Leave Days Taken", type: "number", value: leave, onChange: e => setLeave(e.target.value), placeholder: "0" }),
            React.createElement(HRInp, { label: "Xmas Bonus (K)", type: "number", value: xmas, onChange: e => setXmas(e.target.value), placeholder: "0.00" })),
        staff && total > 0 && React.createElement("div", { style: { background: HRT.navy950, borderRadius: 8, padding: 12, marginBottom: 12 } },
            React.createElement(HRIR, { label: "Total Income", value: fmt(total), mono: true }),
            React.createElement(HRIR, { label: "NAPSA 5%", value: fmt(napsa), mono: true }),
            React.createElement(HRIR, { label: "PAYE (Est.)", value: fmt(paye), mono: true }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: `1px solid ${HRT.navy700}` } },
                React.createElement("span", { style: { color: HRT.gold500, fontFamily: HRF.mono, fontSize: 11, textTransform: "uppercase" } }, "Net Pay"),
                React.createElement("span", { style: { color: "#fff", fontFamily: HRF.display, fontWeight: 700, fontSize: 16 } }, fmt(net)))),
        React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement(HRBtn, { full: true, onClick: generate, bg: HRT.navy700 }, "Print"),
            React.createElement(HRBtn, { full: true, onClick: generateDownload, bg: HRT.gold500 }, "Download PDF"))));
}
/* ── HR SYSTEM (ledger style) ─────────────────────────────────────────────── */
function HRSystem({ db, setDb, user }) {
    const isAccountsOnly = user.role === "accounts";
    const [tab, setTab] = useState(isAccountsOnly ? "payslips" : "dash");
    const [ns, setNs] = useState({ name: "", role: "consultant", customRole: "", pin: "", dept: "", salary: "", startDate: "", province: "", town: "", nrc: "", bank: "", accountNo: "", grade: "", phone: "", email: "", tpin: "" });
    const [nsPhoto, setNsPhoto] = useState(null);
    const [editId, setEditId] = useState(null);
    const [ef, setEf] = useState({ name: "", pin: "", province: "", town: "", nrc: "", bank: "", accountNo: "", grade: "", phone: "", email: "", tpin: "" });
    const [efPhoto, setEfPhoto] = useState(null);
    const isHQR = r => HO_ROLES.includes(r);
    async function addStaff() {
        if (!ns.name || !ns.pin) {
            alert("Enter name and PIN.");
            return;
        }
        if (ns.role === "other" && !ns.customRole) {
            alert("Specify position.");
            return;
        }
        const needsBranch = !isHQR(ns.role);
        if (needsBranch && !ns.town) {
            alert("Select Province and Town.");
            return;
        }
        if (db.staff.find(s => s.name.trim().toLowerCase() === ns.name.trim().toLowerCase())) {
            alert("Name already exists.");
            return;
        }
        const roleLabel = ns.role === "other" ? ns.customRole.trim() : (ns.role === "manager" ? "Branch Manager" : ns.role.charAt(0).toUpperCase() + ns.role.slice(1));
        const sysRole = ["consultant", "officer", "manager", "hr", "accounts", "ceo", "admin", "director", "strategic"].includes(ns.role) ? ns.role : "viewer";
        const branch = needsBranch ? ns.town : "Head Office";
        const province = needsBranch ? ns.province : "Head Office";
        const pinHash = await hashPin(ns.pin);
        const staffId = `STF-${pad(db.staff.length + 1)}`;
        const photoUrl = nsPhoto ? await uploadParcelPhoto(nsPhoto, `staff-${staffId}`) : "";
        const nd = { ...db, staff: [...db.staff, { id: staffId, name: ns.name.trim(), role: sysRole, roleLabel, pinHash, dept: ns.dept, salary: parseFloat(ns.salary) || 0, startDate: ns.startDate, branch, province, active: true, nrc: ns.nrc.trim(), bank: ns.bank.trim(), accountNo: ns.accountNo.trim(), grade: ns.grade.trim(), phone: ns.phone.trim(), email: ns.email.trim(), tpin: ns.tpin.trim(), photoUrl: photoUrl || "" }] };
        saveDB(nd);
        setDb(nd);
        setNs({ name: "", role: "consultant", customRole: "", pin: "", dept: "", salary: "", startDate: "", province: "", town: "", nrc: "", bank: "", accountNo: "", grade: "", phone: "", email: "", tpin: "" });
        setNsPhoto(null);
        alert(`Entry recorded — ${roleLabel} added.`);
    }
    function togStaff(id) { const nd = { ...db, staff: db.staff.map(s => s.id === id ? { ...s, active: !s.active } : s) }; saveDB(nd); setDb(nd); }
    function remStaff(id) { if (!window.confirm("Remove this entry?"))
        return; const nd = { ...db, staff: db.staff.filter(s => s.id !== id) }; saveDB(nd); setDb(nd); }
    function startEdit(s) { setEditId(s.id); setEf({ name: s.name, pin: "", province: s.province || "", town: isHQR(s.role) ? "" : s.branch, nrc: s.nrc || "", bank: s.bank || "", accountNo: s.accountNo || "", grade: s.grade || "", phone: s.phone || "", email: s.email || "", tpin: s.tpin || "" }); setEfPhoto(s.photoUrl || null); }
    async function saveEdit(s) {
        if (!ef.name) {
            alert("Name required.");
            return;
        }
        const needsBranch = !isHQR(s.role);
        const newPinHash = ef.pin.trim() ? await hashPin(ef.pin.trim()) : s.pinHash;
        const photoChanged = efPhoto && efPhoto.startsWith("data:");
        const photoUrl = photoChanged ? (await uploadParcelPhoto(efPhoto, `staff-${s.id}`)) || s.photoUrl : (efPhoto || "");
        const nd = { ...db, staff: db.staff.map(x => x.id === s.id ? { ...x, name: ef.name.trim(), pinHash: newPinHash, branch: needsBranch ? ef.town : s.branch, province: needsBranch ? ef.province : s.province, nrc: ef.nrc, bank: ef.bank, accountNo: ef.accountNo, grade: ef.grade, phone: ef.phone, email: ef.email, tpin: ef.tpin, photoUrl } : x) };
        saveDB(nd);
        setDb(nd);
        setEditId(null);
        alert("Entry updated.");
    }
    function approveLeave(id, status) { const nd = { ...db, leaveRequests: db.leaveRequests.map(r => r.id === id ? { ...r, status, approvedBy: user.name } : r) }; saveDB(nd); setDb(nd); }
    const activeStaff = db.staff.filter(s => s.active).length;
    const inactiveStaff = db.staff.filter(s => !s.active).length;
    const pendingLeaveCt = (db.leaveRequests || []).filter(r => r.status === "Pending").length;
    const branchCt = new Set(db.staff.filter(s => s.branch && s.branch !== "Head Office").map(s => s.branch)).size;
    const deptCounts = {};
    db.staff.filter(s => s.active).forEach(s => { const d = s.dept || s.roleLabel || s.role; deptCounts[d] = (deptCounts[d] || 0) + 1; });
    const maxDept = Math.max(1, ...Object.values(deptCounts));
    const tabDefs = isAccountsOnly
        ? [["payslips", "Payslips"], ["payroll", "Payroll"], ["finance", "Finance"]]
        : [["dash", "Dashboard"], ["staff", "Staff"], ["payslips", "Payslips"], ["leave", "Leave"], ["payroll", "Payroll"], ["finance", "Finance"], ["org", "Org"], ["audit", "Audit"]];
    return (React.createElement("div", { style: { fontFamily: HRF.body } },
        React.createElement("link", { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Spectral:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" }),
        React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" } }, tabDefs.map(([id, lb]) => hrTabBtn(tab === id, () => setTab(id), lb))),
        tab === "dash" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Overview", title: "HR Dashboard" }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 } },
                React.createElement(HRStatCard, { label: "Active Staff", value: activeStaff, sub: `${db.staff.length} total on register` }),
                React.createElement(HRStatCard, { label: "Inactive", value: inactiveStaff, accent: HRT.garnet700 }),
                React.createElement(HRStatCard, { label: "Leave Pending", value: pendingLeaveCt, accent: HRT.gold500 }),
                React.createElement(HRStatCard, { label: "Branches", value: branchCt, accent: HRT.navy700 })),
            React.createElement(HRPanel, { title: "Staff by Department / Role" }, Object.entries(deptCounts).map(([d, c]) => (React.createElement("div", { key: d, style: { marginBottom: 8 } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 } },
                    React.createElement("span", { style: { color: HRT.ink600 } }, d),
                    React.createElement("span", { style: { fontFamily: HRF.mono, color: HRT.ink900 } }, c)),
                React.createElement("div", { style: { background: HRT.parchment100, borderRadius: 4, height: 8, overflow: "hidden" } },
                    React.createElement("div", { style: { background: HRT.navy700, height: "100%", width: `${(c / maxDept * 100)}%` } })))))))),
        tab === "staff" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Personnel", title: "Employee Directory" }),
            React.createElement(HRPanel, { title: "New Ledger Entry" },
                React.createElement(HRInp, { label: "Full Name", req: true, value: ns.name, onChange: e => setNs(f => ({ ...f, name: e.target.value })) }),
                React.createElement(HRSel, { label: "Role", req: true, value: ns.role, onChange: e => setNs(f => ({ ...f, role: e.target.value, customRole: "", province: "", town: "" })) },
                    React.createElement("option", { value: "consultant" }, "Loan Consultant (branch)"),
                    React.createElement("option", { value: "officer" }, "Loan Officer (branch)"),
                    React.createElement("option", { value: "manager" }, "Branch Manager (branch)"),
                    React.createElement("option", { value: "hr" }, "HR (Head Office)"),
                    React.createElement("option", { value: "accounts" }, "Accountant (Head Office)"),
                    React.createElement("option", { value: "ceo" }, "CEO (Head Office)"),
                    React.createElement("option", { value: "admin" }, "Admin (Head Office)"),
                    React.createElement("option", { value: "director" }, "Director (Head Office)"),
                    React.createElement("option", { value: "strategic" }, "Strategic (Head Office)"),
                    React.createElement("option", { value: "other" }, "Other (specify)")),
                ns.role === "other" && React.createElement(HRInp, { label: "Specify Position", req: true, value: ns.customRole, onChange: e => setNs(f => ({ ...f, customRole: e.target.value })) }),
                !isHQR(ns.role) && React.createElement(ProvinceTownSelect, { required: true, province: ns.province, town: ns.town, onProvince: p => setNs(f => ({ ...f, province: p, town: "" })), onTown: t => setNs(f => ({ ...f, town: t })) }),
                isHQR(ns.role) && React.createElement(HRAlrt, { type: "info" }, "Head Office role \u2014 access to all 10 provinces."),
                React.createElement(PhotoUpload, { label: "Passport-Size Photo", value: nsPhoto, onChange: setNsPhoto }),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                    React.createElement(HRInp, { label: "PIN", type: "password", req: true, value: ns.pin, onChange: e => setNs(f => ({ ...f, pin: e.target.value })), placeholder: "4\u20136 digits" }),
                    React.createElement(HRInp, { label: "NRC No.", value: ns.nrc, onChange: e => setNs(f => ({ ...f, nrc: e.target.value })), placeholder: "123456/78/1" }),
                    React.createElement(HRInp, { label: "TPIN No.", value: ns.tpin, onChange: e => setNs(f => ({ ...f, tpin: e.target.value })) }),
                    React.createElement(HRInp, { label: "Phone", value: ns.phone, onChange: e => setNs(f => ({ ...f, phone: e.target.value })), placeholder: "0977000000" }),
                    React.createElement(HRInp, { label: "Email", type: "email", value: ns.email, onChange: e => setNs(f => ({ ...f, email: e.target.value })) }),
                    React.createElement(HRInp, { label: "Department", value: ns.dept, onChange: e => setNs(f => ({ ...f, dept: e.target.value })) }),
                    React.createElement(HRInp, { label: "Grade / Pay Point", value: ns.grade, onChange: e => setNs(f => ({ ...f, grade: e.target.value })) }),
                    React.createElement(HRInp, { label: "Basic Salary (K)", type: "number", value: ns.salary, onChange: e => setNs(f => ({ ...f, salary: e.target.value })) }),
                    React.createElement(HRInp, { label: "Start Date", type: "date", value: ns.startDate, onChange: e => setNs(f => ({ ...f, startDate: e.target.value })) }),
                    React.createElement(HRInp, { label: "Bank Name", value: ns.bank, onChange: e => setNs(f => ({ ...f, bank: e.target.value })) }),
                    React.createElement(HRInp, { label: "Account No.", value: ns.accountNo, onChange: e => setNs(f => ({ ...f, accountNo: e.target.value })) })),
                React.createElement(HRBtn, { full: true, bg: HRT.gold500, onClick: addStaff }, "Save Entry")),
            React.createElement(HRPanel, { title: `Ledger (${db.staff.length} entries)` }, db.staff.map((s, idx) => (React.createElement("div", { key: s.id },
                editId === s.id ? (React.createElement("div", { style: { padding: "10px 0" } },
                    React.createElement(PhotoUpload, { label: "Passport-Size Photo", value: efPhoto, onChange: setEfPhoto, small: true }),
                    React.createElement(HRInp, { label: "Full Name", req: true, value: ef.name, onChange: e => setEf(f => ({ ...f, name: e.target.value })) }),
                    React.createElement(HRInp, { label: "New PIN (leave blank to keep current)", type: "password", value: ef.pin, onChange: e => setEf(f => ({ ...f, pin: e.target.value })) }),
                    React.createElement(HRInp, { label: "NRC No.", value: ef.nrc, onChange: e => setEf(f => ({ ...f, nrc: e.target.value })) }),
                    React.createElement(HRInp, { label: "TPIN No.", value: ef.tpin, onChange: e => setEf(f => ({ ...f, tpin: e.target.value })) }),
                    React.createElement(HRInp, { label: "Phone", value: ef.phone, onChange: e => setEf(f => ({ ...f, phone: e.target.value })) }),
                    React.createElement(HRInp, { label: "Email", type: "email", value: ef.email, onChange: e => setEf(f => ({ ...f, email: e.target.value })) }),
                    React.createElement(HRInp, { label: "Bank Name", value: ef.bank, onChange: e => setEf(f => ({ ...f, bank: e.target.value })) }),
                    React.createElement(HRInp, { label: "Account No.", value: ef.accountNo, onChange: e => setEf(f => ({ ...f, accountNo: e.target.value })) }),
                    React.createElement(HRInp, { label: "Grade", value: ef.grade, onChange: e => setEf(f => ({ ...f, grade: e.target.value })) }),
                    !isHQR(s.role) && React.createElement(ProvinceTownSelect, { required: true, province: ef.province, town: ef.town, onProvince: p => setEf(f => ({ ...f, province: p, town: "" })), onTown: t => setEf(f => ({ ...f, town: t })) }),
                    React.createElement("div", { style: { display: "flex", gap: 8 } },
                        React.createElement(HRBtn, { sm: true, bg: HRT.green700, onClick: () => saveEdit(s) }, "Save"),
                        React.createElement(HRGBtn, { onClick: () => setEditId(null) }, "Cancel")))) : (React.createElement("div", null,
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "70px 1fr auto", padding: "10px 0", alignItems: "center", gap: 8 } },
                        React.createElement("span", { style: { fontFamily: HRF.mono, fontSize: 11, color: HRT.ink600 } }, s.id),
                        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                            s.photoUrl && React.createElement("img", { src: s.photoUrl, alt: "", style: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" } }),
                            React.createElement("div", null,
                                React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 14, color: HRT.ink900 } }, s.name),
                                React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                                    s.roleLabel || s.role,
                                    s.dept ? " · " + s.dept : "",
                                    " \u00B7 ",
                                    s.branch || "—"),
                                (s.phone || s.email) && React.createElement("div", { style: { fontSize: 10, color: HRT.ink600 } }, [s.phone, s.email].filter(Boolean).join(" · ")),
                                s.salary > 0 && React.createElement("div", { style: { fontSize: 11, color: HRT.green700, fontFamily: HRF.mono } },
                                    fmt(s.salary),
                                    "/mo"))),
                        React.createElement(HRBadge, { label: s.active ? "Active" : "Inactive", tone: s.active ? "approved" : "action" })),
                    React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 10 } },
                        React.createElement(HRGBtn, { onClick: () => startEdit(s) }, "Edit"),
                        React.createElement(HRGBtn, { onClick: () => togStaff(s.id) }, s.active ? "Deactivate" : "Activate"),
                        s.salary > 0 && React.createElement(HRGBtn, { onClick: () => openPayslip(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "Payslip"),
                        s.id !== "hr001" && React.createElement(HRGBtn, { onClick: () => remStaff(s.id), style: { color: HRT.garnet700, borderColor: HRT.garnet700 } }, "Remove")))),
                React.createElement(HRRule, null))))))),
        tab === "payslips" && React.createElement(PayslipGenerator, { db: db }),
        tab === "leave" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Leave", title: "Leave Management" }),
            React.createElement(HRPanel, null, (db.leaveRequests || []).length === 0 ? React.createElement(HRAlrt, { type: "info" }, "No leave requests on the ledger.") : (db.leaveRequests || []).slice().reverse().map(r => (React.createElement("div", { key: r.id, style: { padding: "10px 0" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontFamily: HRF.mono, fontSize: 10, color: HRT.ink600 } }, r.id),
                        React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 14 } },
                            r.staffName,
                            " \u2014 ",
                            r.type),
                        React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                            r.from,
                            " \u2192 ",
                            r.to)),
                    React.createElement(HRBadge, { label: r.status, tone: r.status === "Approved" ? "approved" : r.status === "Rejected" ? "action" : "pending" })),
                React.createElement("div", { style: { fontSize: 12, color: HRT.ink600, marginTop: 6 } },
                    "Reason: ",
                    r.reason),
                r.status === "Pending" && React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
                    React.createElement(HRBtn, { sm: true, bg: HRT.green700, onClick: () => approveLeave(r.id, "Approved") }, "Approve"),
                    React.createElement(HRBtn, { sm: true, bg: HRT.garnet700, onClick: () => approveLeave(r.id, "Rejected") }, "Reject")),
                React.createElement(HRRule, null))))))),
        tab === "payroll" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Payroll", title: "Payroll Summary" }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 } },
                React.createElement(HRStatCard, { label: "Active Staff", value: db.staff.filter(s => s.active).length }),
                React.createElement(HRStatCard, { label: "Monthly Payroll", value: fmt(db.staff.filter(s => s.active && s.salary).reduce((s, x) => s + x.salary, 0)), accent: HRT.green700 })),
            React.createElement(HRPanel, null, db.staff.filter(s => s.salary > 0).map(s => (React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${HRT.parchment100}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 13 } }, s.name),
                    React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                        s.roleLabel || s.role,
                        " \u00B7 ",
                        s.branch || "—")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                    React.createElement("div", { style: { fontFamily: HRF.mono, fontWeight: 700, color: HRT.green700, fontSize: 13 } }, fmt(s.salary)),
                    React.createElement(HRGBtn, { onClick: () => openPayslip(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "Slip"),
                    React.createElement(HRGBtn, { onClick: () => downloadPayslipPDF(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "PDF")))))))),
        tab === "finance" && React.createElement(FinanceTracker, { db: db, user: user }),
        tab === "org" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Structure", title: "Organisation Chart" }),
            ["ceo", "admin", "director", "strategic", "hr", "accounts", "manager", "officer", "consultant"].map(role => {
                const members = db.staff.filter(s => s.role === role && s.active);
                if (!members.length)
                    return null;
                return (React.createElement(HRPanel, { key: role, title: `${role === "ceo" ? "CEO" : role.charAt(0).toUpperCase() + role.slice(1)} (${members.length})` }, members.map(s => (React.createElement("div", { key: s.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${HRT.parchment100}` } },
                    React.createElement("div", { style: { width: 30, height: 30, borderRadius: "50%", background: HRT.navy700, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: HRF.display, fontSize: 13, flexShrink: 0 } }, s.name.charAt(0)),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 13 } }, s.name),
                        React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                            s.roleLabel || s.role,
                            " \u00B7 ",
                            s.branch || "—")))))));
            }))),
        tab === "audit" && (React.createElement("div", null,
            React.createElement(HRHeading, { eyebrow: "Register \u2014 Security", title: "Login Audit" }),
            React.createElement(HRPanel, null, (db.loginLogs || []).length === 0 ? React.createElement(HRAlrt, { type: "info" }, "No records yet.") : (db.loginLogs || []).slice().reverse().slice(0, 50).map((log, i) => (React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${HRT.parchment100}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 13 } }, log.name),
                    React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                        log.roleLabel || log.role,
                        " \u00B7 ",
                        log.branch || "—"),
                    React.createElement("div", { style: { fontSize: 11, color: HRT.ink600 } },
                        log.date,
                        " at ",
                        log.time)),
                React.createElement(HRBadge, { label: "Logged In", tone: "approved" })))))))));
}
/* ── FINANCE TRACKER (ledger style) ──────────────────────────────────────── */
function FinanceTracker({ db, user }) {
    const isAdmin = user.role === "admin";
    const [budget, setBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState("");
    const [statutory, setStatutory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBodyName, setNewBodyName] = useState("");
    const [edits, setEdits] = useState({});
    const allocated = db.staff.filter(s => s.active).reduce((s, x) => s + (x.salary || 0), 0);
    const remaining = budget - allocated;
    function refresh() { setLoading(true); Promise.all([loadPayrollBudget(), loadStatutory()]).then(([b, s]) => { setBudget(b); setStatutory(s); setLoading(false); }); }
    useEffect(() => { refresh(); }, []);
    async function saveBudget() { const amt = parseFloat(budgetInput); if (!amt && amt !== 0) {
        alert("Enter an amount.");
        return;
    } await savePayrollBudget(amt, user); setBudgetInput(""); refresh(); alert("Budget entry recorded."); }
    async function saveObligation(o) { const e = edits[o.id] || {}; await saveStatutory({ ...o, amount_due: e.due !== undefined ? parseFloat(e.due) || 0 : o.amount_due, amount_paid: e.paid !== undefined ? parseFloat(e.paid) || 0 : o.amount_paid, notes: e.notes !== undefined ? e.notes : o.notes }); setEdits(x => ({ ...x, [o.id]: undefined })); refresh(); }
    async function addBody() { if (!newBodyName.trim()) {
        alert("Enter a name.");
        return;
    } await addStatutory(newBodyName.trim(), user); setNewBodyName(""); refresh(); }
    if (loading)
        return React.createElement(HRPanel, null,
            React.createElement("div", { style: { textAlign: "center", color: HRT.ink600, padding: 20, fontFamily: HRF.body } }, "Loading ledger..."));
    return (React.createElement("div", null,
        React.createElement(HRHeading, { eyebrow: "Register \u2014 Finance", title: "Payroll Budget & Statutory Obligations" }),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 } },
            React.createElement(HRStatCard, { label: "Total Budget", value: fmt(budget) }),
            React.createElement(HRStatCard, { label: "Allocated", value: fmt(allocated), accent: HRT.navy700 }),
            React.createElement(HRStatCard, { label: "Remaining", value: fmt(remaining), accent: remaining >= 0 ? HRT.green700 : HRT.garnet700 })),
        React.createElement(HRPanel, { title: "Set Payroll Budget" },
            React.createElement(HRAlrt, { type: "info" }, "\"Allocated\" is the sum of all active staff salaries \u2014 calculated automatically."),
            React.createElement(HRInp, { label: "Total Payroll Budget (K)", type: "number", value: budgetInput, onChange: e => setBudgetInput(e.target.value), placeholder: String(budget) }),
            React.createElement(HRBtn, { full: true, bg: HRT.navy800, onClick: saveBudget }, "Save Budget")),
        React.createElement(HRPanel, { title: "Statutory & Regulatory Obligations" },
            statutory.map(o => {
                const e = edits[o.id] || {};
                const due = e.due !== undefined ? e.due : o.amount_due;
                const paid = e.paid !== undefined ? e.paid : o.amount_paid;
                const notes = e.notes !== undefined ? e.notes : (o.notes || "");
                const outstanding = (parseFloat(due) || 0) - (parseFloat(paid) || 0);
                return (React.createElement("div", { key: o.id, style: { padding: "10px 0", borderBottom: `1px solid ${HRT.parchment100}` } },
                    React.createElement("div", { style: { fontFamily: HRF.display, fontWeight: 600, fontSize: 14, color: HRT.ink900, marginBottom: 6 } }, o.name),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                        React.createElement(HRInp, { label: "Amount Due (K)", type: "number", value: due, onChange: ev => setEdits(x => ({ ...x, [o.id]: { ...x[o.id], due: ev.target.value } })) }),
                        React.createElement(HRInp, { label: "Amount Paid (K)", type: "number", value: paid, onChange: ev => setEdits(x => ({ ...x, [o.id]: { ...x[o.id], paid: ev.target.value } })) })),
                    React.createElement(HRInp, { label: "Notes", value: notes, onChange: ev => setEdits(x => ({ ...x, [o.id]: { ...x[o.id], notes: ev.target.value } })), placeholder: "Reference number, deadline, etc." }),
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                        React.createElement(HRBadge, { label: outstanding > 0 ? `Outstanding ${fmt(outstanding)}` : "Fully Paid", tone: outstanding > 0 ? "action" : "approved" }),
                        React.createElement(HRBtn, { sm: true, bg: HRT.navy700, onClick: () => saveObligation(o) }, "Save"))));
            }),
            isAdmin && React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 10 } },
                React.createElement("input", { value: newBodyName, onChange: e => setNewBodyName(e.target.value), placeholder: "Add another body (e.g. NAPSA)", style: { flex: 1, ...hrInpStyle } }),
                React.createElement(HRBtn, { bg: HRT.gold500, onClick: addBody }, "Add")))));
}

function Login({ db, onLogin }) {
    const [name, setName] = useState("");
    const [pin, setPin] = useState("");
    const [err, setErr] = useState("");
    const [show, setShow] = useState(false);
    async function go() {
        const s = db.staff.find(x => x.name.trim().toLowerCase() === name.trim().toLowerCase() && x.active);
        if (!s) {
            setErr("Incorrect name or PIN. Contact HR.");
            return;
        }
        const enteredHash = await hashPin(pin.trim());
        if (enteredHash === s.pinHash)
            onLogin(s);
        else
            setErr("Incorrect name or PIN. Contact HR.");
    }
    return (React.createElement("div", { style: { minHeight: "100vh", background: `linear-gradient(160deg,${C.navy} 0%,${C.blue} 60%,#1976D2 100%)`, display: "flex", flexDirection: "column", alignItems: "center" } },
        React.createElement("div", { style: { width: "100%", maxWidth: 460, position: "relative", height: 220, overflow: "hidden" } },
            React.createElement("img", { src: HERO_PHOTO, alt: "Palian Leadership", style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" } }),
            React.createElement("div", { style: { position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(15,45,92,0.15) 0%,rgba(15,45,92,0.55) 65%,${C.navy} 100%)` } }),
            React.createElement("div", { style: { position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 10 } },
                React.createElement("div", { style: { background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 6 } },
                    React.createElement(PalianLogo, { size: 30 })),
                React.createElement("div", { style: { color: "#fff" } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 14, letterSpacing: 0.5 } }, "PALIAN MONEY LENDING"),
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.85 } }, "Microfinance \u00B7 All 10 Provinces of Zambia"))),
            React.createElement("div", { style: { position: "absolute", bottom: 14, left: 16, right: 16, color: "#fff" } },
                React.createElement("div", { style: { fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
                    "Empowering entrepreneurs across Zambia,",
                    React.createElement("br", null),
                    "one loan at a time."))),
        React.createElement("div", { style: { width: "100%", maxWidth: 460, padding: "0 20px 28px", marginTop: -18, display: "flex", flexDirection: "column", alignItems: "center" } },
            React.createElement("div", { style: { background: C.white, borderRadius: 20, padding: "30px 28px 28px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" } },
                React.createElement("div", { style: { textAlign: "center", marginBottom: 22 } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 17, color: C.navy } }, "Staff Login Portal"),
                    React.createElement("div", { style: { fontSize: 11, color: C.teal, fontWeight: 700, marginTop: 8, background: "#E0F2F1", borderRadius: 8, padding: "6px 12px", display: "inline-block" } }, "\uD83D\uDCBE Data saves automatically + Backup tab available")),
                err && React.createElement(Alrt, { type: "error" }, err),
                React.createElement(Inp, { label: "Full Name", req: true, value: name, onChange: e => { setName(e.target.value); setErr(""); }, placeholder: "Your full name", onKeyDown: e => e.key === "Enter" && go() }),
                React.createElement("div", { style: { marginBottom: 16 } },
                    React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 } },
                        "PIN ",
                        React.createElement("span", { style: { color: C.red } }, "*")),
                    React.createElement("div", { style: { position: "relative" } },
                        React.createElement("input", { style: iSt, type: show ? "text" : "password", value: pin, onChange: e => { setPin(e.target.value); setErr(""); }, placeholder: "Your PIN", onKeyDown: e => e.key === "Enter" && go(), maxLength: 6 }),
                        React.createElement("button", { onClick: () => setShow(!show), style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 } }, show ? "🙈" : "👁️"))),
                React.createElement(Btn, { onClick: go, full: true, color: C.navy, style: { fontSize: 15, padding: 13 } }, "Login \u2192")),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.10)", borderRadius: 16, padding: "12px 16px", marginTop: 18, width: "100%" } },
                React.createElement("img", { src: FOUNDER_SKETCH, alt: "Palian Leadership", style: { width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.6)", flexShrink: 0 } }),
                React.createElement("div", { style: { color: "#fff" } },
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 12 } }, "Built by our leadership team"),
                    React.createElement("div", { style: { fontSize: 10.5, opacity: 0.75, lineHeight: 1.5 } }, "Committed to financial inclusion and ethical lending across Zambia."))))));
}
// ── DASHBOARDS ────────────────────────────────────────────────────────────────
function HODashboard({ db, user, onReport }) {
    const { loans, payments, branchFunds, bankBalance } = db;
    const allPaid = payments.reduce((s, p) => s + p.amount, 0);
    const allDue = loans.reduce((s, l) => s + l.totalDue, 0);
    const allOut = loans.reduce((s, l) => s + getBal(l, payments), 0);
    const rec = allDue > 0 ? (allPaid / allDue * 100).toFixed(1) : 0;
    const countSt = s => loans.filter(l => getSt(l, payments) === s).length;
    const healthOk = parseFloat(rec) >= 70;
    const pendingLoans = loans.filter(l => l.approvalStatus === "Pending").length;
    const pendingDeletions = (db.clients || []).filter(c => c.deletionRequested).length;
    const pendingReports = (db.dailyReports || []).filter(r => r.status === "Pending").length;
    const hasNotifications = pendingLoans > 0 || pendingDeletions > 0 || pendingReports > 0;
    return (React.createElement("div", null,
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 16, padding: "18px 16px", marginBottom: 14, color: "#fff" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
                React.createElement(PalianLogo, { size: 30 }),
                React.createElement("span", { style: { fontSize: 11, opacity: 0.8, fontWeight: 700 } }, "HEAD OFFICE \u2014 ALL 10 PROVINCES")),
            React.createElement("div", { style: { fontSize: 11, opacity: 0.65, marginBottom: 12 } },
                user.roleLabel,
                " \u00B7 ",
                new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 } }, [["💰 BANK", fmt(bankBalance || 0), C.gold], ["📤 OUTSTANDING", fmt(allOut), "#FF8A80"], ["📥 COLLECTED", fmt(allPaid), "#A5D6A7"]].map(([l, v, c]) => (React.createElement("div", { key: l, style: { background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, textAlign: "center" } },
                React.createElement("div", { style: { fontSize: 9, opacity: 0.75, marginBottom: 3 } }, l),
                React.createElement("div", { style: { fontSize: 12, fontWeight: 900, color: c } }, v))))),
            React.createElement("div", { style: { background: healthOk ? "rgba(46,125,50,0.3)" : "rgba(198,40,40,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("span", { style: { fontSize: 18 } }, healthOk ? "✅" : "🚨"),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, healthOk ? "Portfolio healthy" : "Portfolio needs attention"),
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.8 } },
                        "Recovery: ",
                        rec,
                        "%")))),
        hasNotifications && React.createElement(Card, { style: { borderLeft: `4px solid ${C.purple}`, background: "#FAF5FF" } },
            React.createElement(ST, { color: C.purple }, "\uD83D\uDD14 Needs Your Attention"),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                pendingLoans > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8 } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "\u2705 Loans awaiting approval"),
                    React.createElement("span", { style: { background: C.blue, color: "#fff", borderRadius: 12, padding: "2px 10px", fontWeight: 800, fontSize: 12 } }, pendingLoans)),
                pendingDeletions > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8 } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "\uD83D\uDDD1\uFE0F Client deletion requests"),
                    React.createElement("span", { style: { background: C.red, color: "#fff", borderRadius: 12, padding: "2px 10px", fontWeight: 800, fontSize: 12 } }, pendingDeletions)),
                pendingReports > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8 } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "\uD83D\uDDD2\uFE0F Daily reports awaiting approval"),
                    React.createElement("span", { style: { background: C.gold, color: "#fff", borderRadius: 12, padding: "2px 10px", fontWeight: 800, fontSize: 12 } }, pendingReports)))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 } }, [["Clients", db.clients.length, C.navy, "👥"], ["Active", countSt("Active"), C.green, "✅"], ["Overdue", countSt("Overdue"), C.orange, "⏰"], ["Defaulted", countSt("Defaulted"), C.red, "⚠️"], ["Cleared", countSt("Cleared"), C.teal, "🎉"], ["Staff", db.staff.filter(s => s.active).length, C.purple, "👤"]].map(([l, v, c, i]) => (React.createElement(StatCard, { key: l, label: l, value: v, color: c, icon: i })))),
        loans.filter(l => ["Overdue", "Defaulted"].includes(getSt(l, payments))).length > 0 && (React.createElement(Card, { style: { borderLeft: `4px solid ${C.red}` } },
            React.createElement(ST, { color: C.red }, "\u26A0\uFE0F Overdue / Defaulted Across All Branches"),
            loans.filter(l => ["Overdue", "Defaulted"].includes(getSt(l, payments))).slice(0, 5).map(l => {
                const client = db.clients.find(c => c.id === l.clientId);
                return (React.createElement("div", { key: l.loanNo, style: { background: "#FFF5F5", border: `1px solid ${C.red}`, borderRadius: 10, padding: 12, marginBottom: 8 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("strong", { style: { fontSize: 12, color: C.navy } },
                            l.loanNo,
                            " \u2014 ",
                            l.name),
                        React.createElement(Badge, { s: getSt(l, payments) })),
                    React.createElement(DIBadge, { loan: l, pmts: payments }),
                    React.createElement(Btn, { sm: true, color: C.navy, style: { marginTop: 4 }, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Financial Report")));
            })))));
}
function BranchDashboard({ db, user, onNewLoan, onReport }) {
    const branch = user.branch;
    const info = gBI(branch);
    const loans = bL(db, branch);
    const payments = bP(db, branch);
    const branchFund = (db.branchFunds || {})[branch] || 0;
    const myFund = user.role === "consultant" ? (db.consultantFunds || {})[user.id] || 0 : branchFund;
    const countSt = s => loans.filter(l => getSt(l, payments) === s).length;
    const collected = payments.reduce((s, p) => s + p.amount, 0);
    const totalDue = loans.reduce((s, l) => s + l.totalDue, 0);
    const rec = totalDue > 0 ? (collected / totalDue * 100).toFixed(1) : 0;
    const overdue = loans.filter(l => ["Overdue", "Defaulted"].includes(getSt(l, payments)));
    const pendingLoans = loans.filter(l => l.approvalStatus === "Pending").length;
    const pendingReports = (db.dailyReports || []).filter(r => r.status === "Pending" && r.branch === branch).length;
    const hasNotifications = user.role === "manager" && (pendingLoans > 0 || pendingReports > 0);
    return (React.createElement("div", null,
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 16, padding: "18px 16px", marginBottom: 14, color: "#fff" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 } },
                React.createElement(PalianLogo, { size: 26 }),
                React.createElement("span", { style: { fontSize: 10, opacity: 0.8, fontWeight: 700 } },
                    branch.toUpperCase(),
                    ", ",
                    info.province.toUpperCase(),
                    " \u00B7 ",
                    info.provinceCode,
                    "-",
                    info.townCode)),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 15, marginBottom: 2 } },
                "Welcome, ",
                user.name),
            React.createElement("div", { style: { fontSize: 11, opacity: 0.65, marginBottom: 12 } }, user.roleLabel),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                React.createElement("div", { style: { background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 } },
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, "Branch Fund"),
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 800, color: branchFund > 0 ? C.gold : "#ff6b6b" } }, fmt(branchFund))),
                React.createElement("div", { style: { background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 } },
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, "Collected"),
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 800 } }, fmt(collected)))),
            user.role === "consultant" && React.createElement("div", { style: { marginTop: 8, background: myFund > 0 ? "rgba(255,255,255,0.12)" : "rgba(255,0,0,0.2)", borderRadius: 10, padding: 10 } },
                React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, "Your Loan Fund"),
                React.createElement("div", { style: { fontSize: 14, fontWeight: 800, color: myFund > 0 ? C.gold : "#ff6b6b" } }, fmt(myFund)))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 } }, [["Clients", bC(db, branch).length, C.navy, "👥"], ["Active", countSt("Active"), C.green, "✅"], ["Overdue", countSt("Overdue"), C.orange, "⏰"], ["Defaulted", countSt("Defaulted"), C.red, "⚠️"], ["Cleared", countSt("Cleared"), C.teal, "🎉"], ["Recovery", rec + "%", parseFloat(rec) >= 70 ? C.green : C.red, "📊"]].map(([l, v, c, i]) => (React.createElement(StatCard, { key: l, label: l, value: v, color: c, icon: i, small: true })))),
        hasNotifications && React.createElement(Card, { style: { borderLeft: `4px solid ${C.purple}`, background: "#FAF5FF" } },
            React.createElement(ST, { color: C.purple }, "\uD83D\uDD14 Needs Your Attention"),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                pendingLoans > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8 } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "\u2705 Loans awaiting approval"),
                    React.createElement("span", { style: { background: C.blue, color: "#fff", borderRadius: 12, padding: "2px 10px", fontWeight: 800, fontSize: 12 } }, pendingLoans)),
                pendingReports > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8 } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "\uD83D\uDDD2\uFE0F Daily reports awaiting approval"),
                    React.createElement("span", { style: { background: C.gold, color: "#fff", borderRadius: 12, padding: "2px 10px", fontWeight: 800, fontSize: 12 } }, pendingReports)))),
        overdue.length > 0 && React.createElement(Card, { style: { borderLeft: `4px solid ${C.red}` } },
            React.createElement(ST, { color: C.red },
                "\u26A0\uFE0F Overdue in ",
                branch,
                " (",
                overdue.length,
                ")"),
            overdue.map(l => {
                const client = db.clients.find(c => c.id === l.clientId);
                return (React.createElement("div", { key: l.loanNo, style: { background: "#FFF5F5", border: `1px solid ${C.red}`, borderRadius: 10, padding: 12, marginBottom: 8 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("strong", { style: { fontSize: 12, color: C.navy } },
                            l.loanNo,
                            " \u2014 ",
                            l.name),
                        React.createElement(Badge, { s: getSt(l, payments) })),
                    React.createElement(DIBadge, { loan: l, pmts: payments }),
                    React.createElement(Btn, { sm: true, color: C.navy, style: { marginTop: 4 }, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Financial Report")));
            })),
        loans.length === 0 && React.createElement(Card, { style: { textAlign: "center", padding: 40 } },
            React.createElement(PalianLogo, { size: 52 }),
            React.createElement("div", { style: { fontWeight: 700, color: C.navy, fontSize: 16, marginBottom: 8, marginTop: 10 } },
                branch,
                ", ",
                info.province),
            React.createElement("div", { style: { color: C.muted, marginBottom: 20 } }, "No loans yet."),
            React.createElement(Btn, { onClick: onNewLoan, color: C.blue }, "\u2795 Register First Loan"))));
}
// ── ACCOUNTS FUNDS ────────────────────────────────────────────────────────────
function AccountsFunds({ db, setDb }) {
    const [dep, setDep] = useState({ amt: "", note: "", province: "", town: "" });
    const [bAmt, setBAmt] = useState("");
    const { branchFunds, bankBalance } = db;
    function deposit() { const a = parseFloat(dep.amt); if (!a || !dep.town) {
        alert("Enter amount and select town.");
        return;
    } const nd = { ...db, bankBalance: (bankBalance || 0) - a, branchFunds: { ...branchFunds, [dep.town]: (branchFunds[dep.town] || 0) + a } }; saveDB(nd); setDb(nd); setDep({ amt: "", note: "", province: "", town: "" }); alert(`✅ ${fmt(a)} sent to ${dep.town}.`); }
    function bankDeposit() { const a = parseFloat(bAmt); if (!a) {
        alert("Enter amount.");
        return;
    } const nd = { ...db, bankBalance: (bankBalance || 0) + a }; saveDB(nd); setDb(nd); setBAmt(""); alert(`✅ ${fmt(a)} deposited. Balance: ${fmt(nd.bankBalance)}`); }
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.teal},#00897B)`, color: "#fff", padding: 18, marginBottom: 14 } },
            React.createElement("div", { style: { fontSize: 14, fontWeight: 800, marginBottom: 10 } }, "\uD83D\uDCB0 Fund Management"),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                React.createElement("div", { style: { background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 } },
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, "Bank Balance"),
                    React.createElement("div", { style: { fontSize: 16, fontWeight: 800, color: C.gold } }, fmt(bankBalance || 0))),
                React.createElement("div", { style: { background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 } },
                    React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, "Deployed"),
                    React.createElement("div", { style: { fontSize: 16, fontWeight: 800 } }, fmt(Object.values(branchFunds || {}).reduce((s, v) => s + v, 0)))))),
        React.createElement(Card, null,
            React.createElement(ST, { color: C.teal }, "\uD83C\uDFE6 Record Bank Deposit"),
            React.createElement(Inp, { label: "Amount (K)", req: true, type: "number", value: bAmt, onChange: e => setBAmt(e.target.value), placeholder: "0.00" }),
            React.createElement(Btn, { onClick: bankDeposit, color: C.teal, full: true }, "\uD83D\uDCB3 Record Deposit")),
        React.createElement(Card, null,
            React.createElement(ST, { color: C.purple }, "\uD83D\uDCE4 Send Funds to Branch"),
            React.createElement(ProvinceTownSelect, { required: true, province: dep.province, town: dep.town, onProvince: p => setDep(f => ({ ...f, province: p, town: "" })), onTown: t => setDep(f => ({ ...f, town: t })) }),
            React.createElement(Inp, { label: "Amount (K)", req: true, type: "number", value: dep.amt, onChange: e => setDep(f => ({ ...f, amt: e.target.value })), placeholder: "0.00" }),
            React.createElement(Inp, { label: "Note", value: dep.note, onChange: e => setDep(f => ({ ...f, note: e.target.value })), placeholder: "e.g. Monthly allocation" }),
            React.createElement(Btn, { onClick: deposit, color: C.purple, full: true, disabled: !dep.town || !(bankBalance > 0) }, "\uD83D\uDCE4 Send to Branch"))));
}
// ── MANAGER FUNDS ─────────────────────────────────────────────────────────────
function ManagerFunds({ db, setDb, user }) {
    const canOverride = isHO(user.role);
    const allBranches = [...new Set(db.staff.filter(s => s.branch && s.branch !== "Head Office").map(s => s.branch))].sort();
    const [overrideBranch, setOverrideBranch] = useState("");
    const branch = canOverride ? (overrideBranch || "") : user.branch;
    const branchFund = branch ? (db.branchFunds || {})[branch] || 0 : 0;
    const consultants = branch ? db.staff.filter(s => s.role === "consultant" && s.branch === branch && s.active) : [];
    const [cAmts, setCAmts] = useState({});
    const [cTgts, setCTgts] = useState({});
    function allocate(id, name) { const a = parseFloat(cAmts[id] || 0); if (!a || a > branchFund) {
        alert(!a ? "Enter amount." : `Insufficient: ${fmt(branchFund)}`);
        return;
    } const nd = { ...db, branchFunds: { ...db.branchFunds, [branch]: Math.max(0, branchFund - a) }, consultantFunds: { ...db.consultantFunds, [id]: (db.consultantFunds[id] || 0) + a } }; saveDB(nd); setDb(nd); setCAmts(x => ({ ...x, [id]: "" })); alert(`✅ ${fmt(a)} → ${name}`); }
    function setTgt(id, name) { const t = parseFloat(cTgts[id] || 0); if (!t)
        return; const nd = { ...db, consultantTargets: { ...db.consultantTargets, [id]: t } }; saveDB(nd); setDb(nd); setCTgts(x => ({ ...x, [id]: "" })); alert(`✅ Target set for ${name}`); }
    return (React.createElement("div", null,
        canOverride && (React.createElement(Card, { style: { borderLeft: `4px solid ${C.purple}` } },
            React.createElement(ST, { color: C.purple }, "\uD83D\uDD11 Admin Override \u2014 Manage Any Branch"),
            React.createElement(Alrt, { type: "info" },
                "As ",
                user.roleLabel || user.role,
                ", you can step into any branch's fund management directly \u2014 useful for fixing mistakes or covering when a manager is unavailable."),
            React.createElement(Sel, { label: "Select Branch", value: overrideBranch, onChange: e => setOverrideBranch(e.target.value) },
                React.createElement("option", { value: "" }, "-- Choose a branch --"),
                allBranches.map(b => React.createElement("option", { key: b, value: b }, b))))),
        !branch ? (canOverride && React.createElement(Card, { style: { textAlign: "center", padding: 32, color: C.muted } }, "Select a branch above to manage its funds.")) : (React.createElement(React.Fragment, null,
            React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, color: "#fff", padding: 16, marginBottom: 14 } },
                React.createElement("div", { style: { fontSize: 13, fontWeight: 800, marginBottom: 8 } },
                    "\uD83D\uDCBC Branch Fund \u2014 ",
                    branch),
                React.createElement(IR, { label: "Available", value: fmt(branchFund) })),
            React.createElement(Card, null,
                React.createElement(ST, null, "\uD83D\uDCE4 Allocate to Consultants"),
                consultants.length === 0 ? React.createElement(Alrt, { type: "warn" }, "No consultants in this branch yet.") : consultants.map(s => (React.createElement("div", { key: s.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 12 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.navy, marginBottom: 4 } }, s.name),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted, marginBottom: 10 } },
                        "Fund: ",
                        React.createElement("strong", { style: { color: C.teal } }, fmt((db.consultantFunds || {})[s.id] || 0)),
                        " \u00B7 Target: ",
                        React.createElement("strong", null, fmt((db.consultantTargets || {})[s.id] || 0))),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
                        React.createElement("div", null,
                            React.createElement(Inp, { label: "Allocate (K)", type: "number", value: cAmts[s.id] || "", onChange: e => setCAmts(x => ({ ...x, [s.id]: e.target.value })), placeholder: "0.00" }),
                            React.createElement(Btn, { sm: true, color: C.teal, onClick: () => allocate(s.id, s.name), disabled: branchFund <= 0 }, "Allocate")),
                        React.createElement("div", null,
                            React.createElement(Inp, { label: "Set Target (K)", type: "number", value: cTgts[s.id] || "", onChange: e => setCTgts(x => ({ ...x, [s.id]: e.target.value })), placeholder: "0.00" }),
                            React.createElement(Btn, { sm: true, color: C.purple, onClick: () => setTgt(s.id, s.name) }, "Set Target")))))))))));
}

function Wizard({ db, setDb, user, onDone }) {
    const [step, setStep] = useState(1);
    const [nrc, setNrc] = useState("");
    const [nrcErr, setNrcErr] = useState("");
    const [ex, setEx] = useState(null);
    const [crossBranch, setCrossBranch] = useState(null);
    const [blockedLoan, setBlockedLoan] = useState(null);
    const [cf, setCf] = useState({ name: "", sex: "", dob: "", phone: "", email: "", address: "", company: "", bank: "", accountNo: "", bankCode: "", tpin: "", nok_name: "", nok_phone: "", nok_relationship: "", nok_address: "" });
    const [photo, setPhoto] = useState(null);
    const [docs, setDocs] = useState({ nrcPhoto: null, payslip: null, bankStatement: null });
    const [lf, setLf] = useState({ type: "", amount: "", rate: "0.35", period: "1 Month", disburse: today(), due: "", remarks: "" });
    const [col, setCol] = useState({ item: "Television", desc: "", value: "", serial: "", location: "", photo: null });
    const [ded, setDed] = useState({ salary: "", monthly: "", payrollDate: "" });
    const [signedLoan, setSignedLoan] = useState(null);
    const [done, setDone] = useState(null);
    const canOverrideBranch = isHO(user.role);
    const [overrideBranch, setOverrideBranch] = useState("");
    const [overrideProvince, setOverrideProvince] = useState("");
    const branch = canOverrideBranch ? overrideBranch : user.branch;
    const info = branch ? gBI(branch) : { province: "—", provinceCode: "HO", townCode: "HOQ" };
    const amt = parseFloat(lf.amount) || 0;
    const rate = parseFloat(lf.rate) || 0.35;
    const interest = amt * rate;
    const total = amt + interest;
    const myFund = user.role === "consultant" ? (db.consultantFunds || {})[user.id] || 0 : (db.branchFunds || {})[branch] || 0;
    function checkNRC() {
        const n = nrc.trim().toUpperCase();
        if (!validNRC(n)) {
            setNrcErr("Format: 123456/78/1");
            return;
        }
        setNrcErr("");
        const found = db.clients.find(c => c.nrc === n);
        if (found) {
            setEx(found);
            if (found.branch && found.branch !== branch)
                setCrossBranch({ branch: found.branch, loans: db.loans.filter(l => l.clientId === found.id) });
            else
                setCrossBranch(null);
            const openLoan = db.loans.find(l => l.clientId === found.id && !["Cleared", "Rejected"].includes(getSt(l, db.payments)));
            setBlockedLoan(openLoan || null);
        }
        else {
            setEx(null);
            setCrossBranch(null);
            setBlockedLoan(null);
        }
        setStep(2);
    }
    function step2Next() { if (blockedLoan)
        return; if (ex) {
        setStep(3);
        return;
    } if (!cf.name || !cf.phone || !cf.sex || !cf.address) {
        alert("Fill Name, Sex, Phone, Address.");
        return;
    } setStep(3); }
    function step3Next() { if (!lf.type || !lf.amount || !lf.disburse) {
        alert("Fill Loan Type, Amount, Date.");
        return;
    } if (myFund < amt) {
        alert(`Insufficient fund: ${fmt(myFund)}`);
        return;
    } setStep(4); }
    function submit() {
        const nd = { ...db, clients: [...db.clients], loans: [...db.loans], payments: [...db.payments] };
        let client = ex;
        if (!client) {
            client = { id: `CLT-${pad(db.clients.length + 1)}`, regDate: today(), branch, province: info.province, name: cf.name.trim(), nrc: nrc.trim().toUpperCase(), sex: cf.sex, dob: cf.dob, phone: cf.phone.trim(), email: cf.email.trim(), address: cf.address.trim(), company: cf.company.trim(), bank: cf.bank.trim(), accountNo: cf.accountNo.trim(), bankCode: cf.bankCode.trim(), tpin: cf.tpin.trim(), nok_name: cf.nok_name.trim(), nok_phone: cf.nok_phone.trim(), nok_relationship: cf.nok_relationship.trim(), nok_address: cf.nok_address.trim(), passportPhoto: photo, docs };
            nd.clients.push(client);
        }
        if (user.role === "consultant")
            nd.consultantFunds = { ...nd.consultantFunds, [user.id]: Math.max(0, (nd.consultantFunds[user.id] || 0) - amt) };
        else
            nd.branchFunds = { ...nd.branchFunds, [branch]: Math.max(0, (nd.branchFunds[branch] || 0) - amt) };
        const seq = nd.loans.filter(l => l.branch === branch).length + 1;
        const loanNo = `LN-${info.provinceCode}${info.townCode}-${pad(seq)}`;
        const extra = lf.type === "Collateral" ? { collateral: col } : lf.type === "Deduction" ? { deduction: ded } : {};
        const loan = { loanNo, clientId: client.id, nrc: client.nrc, name: client.name, branch, province: info.province, branchCode: `${info.provinceCode}-${info.townCode}`, type: lf.type, principal: amt, interestRate: rate, interest, totalDue: total, period: lf.period, appDate: today(), disburseDate: lf.disburse, dueDate: lf.due, consultant: user.name, consultantId: user.id, approvalStatus: "Pending", approvedBy: "", approvedDate: "", remarks: lf.remarks, loanNumForClient: nd.loans.filter(l => l.clientId === client.id).length + 1, signedLoanCopy: signedLoan, ...extra };
        nd.loans.push(loan);
        saveDB(nd);
        setDb(nd);
        setDone({ client, loan });
        setStep(5);
    }
    if (step === 5 && done)
        return (React.createElement(Card, { style: { textAlign: "center", padding: 32 } },
            React.createElement("div", { style: { width: 64, height: 64, background: "#E8F5E9", borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 14px" } }, "\u2705"),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 18, color: C.green, marginBottom: 6 } }, "Loan Submitted!"),
            React.createElement("div", { style: { color: C.muted, fontSize: 13, marginBottom: 16 } },
                done.loan.loanNo,
                " \u2014 awaiting Manager approval"),
            React.createElement(IR, { label: "Loan No.", value: done.loan.loanNo }),
            React.createElement(IR, { label: "Total Due", value: fmt(done.loan.totalDue), bold: true }),
            React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" } },
                React.createElement(Btn, { onClick: onDone, color: C.navy }, "\uD83D\uDCCA Dashboard"),
                React.createElement(Btn, { color: C.orange, onClick: () => { setStep(1); setNrc(""); setEx(null); setDone(null); } }, "\u2795 New Loan"))));
    return (React.createElement("div", null,
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#fff", fontSize: 12 } },
            "\uD83D\uDCCD ",
            branch || "No branch selected",
            branch ? `, ${info.province}` : "",
            branch ? " \u00B7 Fund: " : "",
            branch && React.createElement("strong", { style: { color: myFund > 0 ? C.gold : "#ff6b6b" } }, fmt(myFund))),
        React.createElement("div", { style: { display: "flex", marginBottom: 18, borderRadius: 10, overflow: "hidden" } }, ["NRC", "Client", "Loan", "Review"].map((l, i) => React.createElement("div", { key: l, style: { flex: 1, textAlign: "center", padding: "9px 4px", fontSize: 11, fontWeight: 700, background: step > i + 1 ? C.green : step === i + 1 ? C.navy : "#e5e7eb", color: (step > i + 1 || step === i + 1) ? "#fff" : C.muted, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none" } },
            step > i + 1 ? "✓ " : "",
            l))),
        step === 1 && React.createElement(Card, null,
            React.createElement(ST, null, "Step 1 \u2014 NRC Lookup"),
            canOverrideBranch && React.createElement(Alrt, { type: "warn" }, "\uD83D\uDD11 Admin/HO access \u2014 select which branch you're issuing this loan for."),
            canOverrideBranch && React.createElement(ProvinceTownSelect, { required: true, province: overrideProvince, town: overrideBranch, onProvince: setOverrideProvince, onTown: setOverrideBranch }),
            (!canOverrideBranch || branch) && React.createElement(React.Fragment, null,
                React.createElement(Alrt, { type: "info" }, "Checks NRC across ALL 10 provinces."),
                React.createElement(Inp, { label: "NRC Number", req: true, value: nrc, onChange: e => { setNrc(e.target.value.toUpperCase()); setNrcErr(""); }, placeholder: "123456/78/1", note: "Format: 123456/78/1" }),
                nrcErr && React.createElement(Alrt, { type: "error" },
                    "\u274C ",
                    nrcErr),
                React.createElement(Btn, { onClick: checkNRC, full: true, color: C.blue }, "Check NRC \u2192"))),
        step === 2 && (React.createElement(Card, null,
            React.createElement(ST, null, ex ? `Found — ${ex.name}` : "New Client Registration"),
            blockedLoan && (React.createElement(Alrt, { type: "error" },
                "\uD83D\uDEAB ",
                React.createElement("strong", null, "Loan Rejected \u2014 Existing Unresolved Loan"),
                React.createElement("br", null),
                "This client already has loan ",
                React.createElement("strong", null, blockedLoan.loanNo),
                " with status ",
                React.createElement("strong", null, getSt(blockedLoan, db.payments)),
                " (Balance: ",
                fmt(getBal(blockedLoan, db.payments)),
                ").",
                React.createElement("br", null),
                "They must fully clear this loan before a new one can be issued.")),
            !blockedLoan && crossBranch && React.createElement(Alrt, { type: "warn" },
                "\u26A0\uFE0F Cross-Branch: registered at ",
                React.createElement("strong", null, crossBranch.branch),
                " with ",
                crossBranch.loans.length,
                " loan(s)."),
            !blockedLoan && ex && !crossBranch && React.createElement(Alrt, { type: "success" }, "\u2705 Client found \u2014 adding new loan"),
            ex ? React.createElement("div", { style: { background: "#E3F2FD", borderRadius: 10, padding: 14, marginBottom: 12 } },
                ex.passportPhoto && React.createElement("img", { src: ex.passportPhoto, alt: "", style: { width: 56, height: 56, borderRadius: 10, objectFit: "cover", marginBottom: 8 } }),
                React.createElement(IR, { label: "ID", value: ex.id }),
                React.createElement(IR, { label: "NRC", value: ex.nrc }),
                React.createElement(IR, { label: "Phone", value: ex.phone }),
                React.createElement(IR, { label: "NOK", value: ex.nok_name || "—" }))
                : (React.createElement("div", null,
                    React.createElement(PhotoUpload, { label: "Passport Photo", value: photo, onChange: setPhoto }),
                    React.createElement(Inp, { label: "Full Name", req: true, value: cf.name, onChange: e => setCf(f => ({ ...f, name: e.target.value })), placeholder: "Name as on NRC" }),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                        React.createElement(Sel, { label: "Sex", req: true, value: cf.sex, onChange: e => setCf(f => ({ ...f, sex: e.target.value })) },
                            React.createElement("option", { value: "" }, "--"),
                            React.createElement("option", null, "Male"),
                            React.createElement("option", null, "Female")),
                        React.createElement(Inp, { label: "Date of Birth", type: "date", value: cf.dob, onChange: e => setCf(f => ({ ...f, dob: e.target.value })) })),
                    React.createElement(Inp, { label: "Phone", req: true, value: cf.phone, onChange: e => setCf(f => ({ ...f, phone: e.target.value })), placeholder: "0977000000" }),
                    React.createElement(Inp, { label: "Email", type: "email", value: cf.email, onChange: e => setCf(f => ({ ...f, email: e.target.value })) }),
                    React.createElement(Inp, { label: "Physical Address", req: true, value: cf.address, onChange: e => setCf(f => ({ ...f, address: e.target.value })) }),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                        React.createElement(Inp, { label: "Employer", value: cf.company, onChange: e => setCf(f => ({ ...f, company: e.target.value })) }),
                        React.createElement(Inp, { label: "Bank Name", value: cf.bank, onChange: e => setCf(f => ({ ...f, bank: e.target.value })) }),
                        React.createElement(Inp, { label: "Account No.", value: cf.accountNo, onChange: e => setCf(f => ({ ...f, accountNo: e.target.value })) }),
                        React.createElement(Inp, { label: "Bank Code", value: cf.bankCode, onChange: e => setCf(f => ({ ...f, bankCode: e.target.value })), placeholder: "e.g. 060144" }),
                        React.createElement(Inp, { label: "TPIN No.", value: cf.tpin, onChange: e => setCf(f => ({ ...f, tpin: e.target.value })) })),
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: C.navy, margin: "8px 0 10px", borderLeft: `3px solid ${C.teal}`, paddingLeft: 8 } }, "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Next of Kin"),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                        React.createElement(Inp, { label: "NOK Full Name", value: cf.nok_name, onChange: e => setCf(f => ({ ...f, nok_name: e.target.value })), placeholder: "Next of Kin name" }),
                        React.createElement(Inp, { label: "NOK Phone", value: cf.nok_phone, onChange: e => setCf(f => ({ ...f, nok_phone: e.target.value })), placeholder: "0977..." }),
                        React.createElement(Sel, { label: "Relationship", value: cf.nok_relationship, onChange: e => setCf(f => ({ ...f, nok_relationship: e.target.value })) },
                            React.createElement("option", { value: "" }, "-- Select --"),
                            React.createElement("option", null, "Spouse"),
                            React.createElement("option", null, "Parent"),
                            React.createElement("option", null, "Sibling"),
                            React.createElement("option", null, "Child"),
                            React.createElement("option", null, "Relative"),
                            React.createElement("option", null, "Friend"),
                            React.createElement("option", null, "Other")),
                        React.createElement(Inp, { label: "NOK Address", value: cf.nok_address, onChange: e => setCf(f => ({ ...f, nok_address: e.target.value })), placeholder: "Address" })),
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: C.navy, margin: "8px 0 10px", borderLeft: `3px solid ${C.orange}`, paddingLeft: 8 } }, "\uD83D\uDCCE Documents"),
                    React.createElement(PhotoUpload, { small: true, label: "NRC Copy", value: docs.nrcPhoto, onChange: v => setDocs(d => ({ ...d, nrcPhoto: v })) }),
                    React.createElement(PhotoUpload, { small: true, label: "Payslip", value: docs.payslip, onChange: v => setDocs(d => ({ ...d, payslip: v })) }),
                    React.createElement(PhotoUpload, { small: true, label: "Bank Statement", value: docs.bankStatement, onChange: v => setDocs(d => ({ ...d, bankStatement: v })) }))),
            React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8 } },
                React.createElement(GBtn, { onClick: () => setStep(1) }, "\u2190 Back"),
                React.createElement(Btn, { style: { flex: 1 }, onClick: step2Next, disabled: !!blockedLoan, color: blockedLoan ? C.muted : undefined }, blockedLoan ? "🚫 Blocked" : "Next →")))),
        step === 3 && (React.createElement(Card, null,
            React.createElement(ST, null, "Step 3 \u2014 Loan Details"),
            React.createElement(Alrt, { type: myFund >= amt && amt > 0 ? "success" : "info" },
                "Fund: ",
                React.createElement("strong", null, fmt(myFund))),
            React.createElement(Sel, { label: "Loan Type", req: true, value: lf.type, onChange: e => setLf(f => ({ ...f, type: e.target.value })) },
                React.createElement("option", { value: "" }, "-- Select --"),
                React.createElement("option", null, "Collateral"),
                React.createElement("option", null, "Deduction")),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                React.createElement(Inp, { label: "Amount (K)", req: true, type: "number", value: lf.amount, onChange: e => setLf(f => ({ ...f, amount: e.target.value })), placeholder: "0.00" }),
                React.createElement(Sel, { label: "Interest Rate", value: lf.rate, onChange: e => setLf(f => ({ ...f, rate: e.target.value })) },
                    React.createElement("option", { value: "0.35" }, "35%"),
                    React.createElement("option", { value: "0.30" }, "30%"),
                    React.createElement("option", { value: "0.25" }, "25%"),
                    React.createElement("option", { value: "0.23" }, "23%"),
                    React.createElement("option", { value: "0.20" }, "20%")),
                React.createElement(Sel, { label: "Period", value: lf.period, onChange: e => setLf(f => ({ ...f, period: e.target.value })) },
                    React.createElement("option", null, "1 Month"),
                    React.createElement("option", null, "2 Months"),
                    React.createElement("option", null, "3 Months"),
                    React.createElement("option", null, "6 Months"),
                    React.createElement("option", null, "12 Months")),
                React.createElement(Inp, { label: "Disbursement Date", req: true, type: "date", value: lf.disburse, onChange: e => setLf(f => ({ ...f, disburse: e.target.value })) }),
                React.createElement(Inp, { label: "Due Date", type: "date", value: lf.due, onChange: e => setLf(f => ({ ...f, due: e.target.value })) })),
            React.createElement(Inp, { label: "Remarks", value: lf.remarks, onChange: e => setLf(f => ({ ...f, remarks: e.target.value })) }),
            lf.type === "Collateral" && (React.createElement("div", null,
                React.createElement(PhotoUpload, { label: "Collateral Photo", value: col.photo, onChange: v => setCol(c => ({ ...c, photo: v })) }),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                    React.createElement(Sel, { label: "Item Type", value: col.item, onChange: e => setCol(c => ({ ...c, item: e.target.value })) },
                        React.createElement("option", null, "Television"),
                        React.createElement("option", null, "Vehicle"),
                        React.createElement("option", null, "Land Title"),
                        React.createElement("option", null, "Laptop"),
                        React.createElement("option", null, "Phone"),
                        React.createElement("option", null, "Generator"),
                        React.createElement("option", null, "Furniture"),
                        React.createElement("option", null, "Other")),
                    React.createElement(Inp, { label: "Est. Value (K)", type: "number", value: col.value, onChange: e => setCol(c => ({ ...c, value: e.target.value })) }),
                    React.createElement(Inp, { label: "Description", value: col.desc, onChange: e => setCol(c => ({ ...c, desc: e.target.value })) }),
                    React.createElement(Inp, { label: "Serial No.", value: col.serial, onChange: e => setCol(c => ({ ...c, serial: e.target.value })) })),
                React.createElement(Inp, { label: "Storage Location", value: col.location, onChange: e => setCol(c => ({ ...c, location: e.target.value })) }))),
            lf.type === "Deduction" && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                React.createElement(Inp, { label: "Net Salary (K)", type: "number", value: ded.salary, onChange: e => setDed(d => ({ ...d, salary: e.target.value })), placeholder: "0.00" }),
                React.createElement(Inp, { label: "Monthly Deduction (K)", type: "number", value: ded.monthly, onChange: e => setDed(d => ({ ...d, monthly: e.target.value })), placeholder: "0.00" }),
                React.createElement(Inp, { label: "Payroll Date", type: "date", value: ded.payrollDate, onChange: e => setDed(d => ({ ...d, payrollDate: e.target.value })) })),
            React.createElement(PhotoUpload, { small: true, label: "\uD83D\uDCCE Signed Loan Agreement", value: signedLoan, onChange: setSignedLoan }),
            amt > 0 && React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginTop: 12 } }, [["PRINCIPAL", fmt(amt), "#fff"], [`INTEREST ${Math.round(rate * 100)}%`, fmt(interest), "rgba(255,255,255,0.85)"], ["TOTAL DUE", fmt(total), C.amber]].map(([l, v, c]) => React.createElement("div", { key: l },
                React.createElement("div", { style: { fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, marginBottom: 3 } }, l),
                React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: c } }, v)))),
            React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 14 } },
                React.createElement(GBtn, { onClick: () => setStep(2) }, "\u2190 Back"),
                React.createElement(Btn, { style: { flex: 1 }, onClick: step3Next }, "Review \u2192")))),
        step === 4 && (React.createElement(Card, null,
            React.createElement(ST, null, "Step 4 \u2014 Confirm"),
            React.createElement(Alrt, { type: "warn" },
                "Loan will be ",
                React.createElement("strong", null, "Pending"),
                " until Manager approves."),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, marginBottom: 8 } }, "CLIENT"),
                    React.createElement(IR, { label: "Name", value: ex?.name || cf.name }),
                    React.createElement(IR, { label: "NRC", value: nrc.toUpperCase() }),
                    React.createElement(IR, { label: "NOK", value: cf.nok_name || ex?.nok_name || "—" })),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, marginBottom: 8 } }, "LOAN"),
                    React.createElement(IR, { label: "Type", value: lf.type }),
                    React.createElement(IR, { label: "Principal", value: fmt(amt) }),
                    React.createElement(IR, { label: "Interest", value: `${Math.round(rate * 100)}% = ${fmt(interest)}` }),
                    React.createElement(IR, { label: "Total Due", value: fmt(total), bold: true }))),
            React.createElement("div", { style: { display: "flex", gap: 10 } },
                React.createElement(GBtn, { onClick: () => setStep(3) }, "\u2190 Edit"),
                React.createElement(Btn, { color: C.green, style: { flex: 1 }, onClick: submit }, "\u2705 Submit Loan"))))));
}
// ── APPROVALS ─────────────────────────────────────────────────────────────────
function Approvals({ db, setDb, user }) {
    const isHORole = isHO(user.role);
    const pending = isHORole ? db.loans.filter(l => l.approvalStatus === "Pending") : db.loans.filter(l => l.approvalStatus === "Pending" && l.branch === user.branch);
    const can = user.role === "manager" || isHORole;
    function act(loanNo, status) { const nd = { ...db, loans: db.loans.map(l => l.loanNo === loanNo ? { ...l, approvalStatus: status, approvedBy: user.name, approvedDate: today() } : l) }; saveDB(nd); setDb(nd); }
    return (React.createElement(Card, null,
        React.createElement(ST, null,
            "Approvals (",
            pending.length,
            " pending)"),
        !can && React.createElement(Alrt, { type: "warn" }, "\uD83D\uDD12 Only the Branch Manager can approve loans."),
        pending.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 32 } },
            React.createElement("div", { style: { fontSize: 40 } }, "\u2705"),
            React.createElement("p", null, "No pending approvals."))
            : pending.map(l => (React.createElement("div", { key: l.loanNo, style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12 } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } },
                    React.createElement("strong", { style: { color: C.navy } },
                        l.loanNo,
                        isHORole && React.createElement("span", { style: { fontSize: 11, color: C.muted, marginLeft: 8 } },
                            "\u00B7 ",
                            l.branch)),
                    React.createElement(Badge, { s: "Pending" })),
                React.createElement(IR, { label: "Client", value: l.name }),
                React.createElement(IR, { label: "NRC", value: l.nrc }),
                React.createElement(IR, { label: "Type", value: l.type }),
                React.createElement(IR, { label: "Principal", value: fmt(l.principal) }),
                React.createElement(IR, { label: "Total Due", value: fmt(l.totalDue), bold: true }),
                React.createElement(IR, { label: "Consultant", value: l.consultant }),
                can && React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 12 } },
                    React.createElement(Btn, { color: C.green, sm: true, onClick: () => act(l.loanNo, "Approved"), style: { flex: 1 } }, "\u2705 Approve"),
                    React.createElement(Btn, { color: C.red, sm: true, onClick: () => act(l.loanNo, "Rejected"), style: { flex: 1 } }, "\u274C Reject")))))));
}
// ── PAYMENTS ──────────────────────────────────────────────────────────────────
function Payments({ db, setDb, user, onReport }) {
    const branch = user.branch;
    const isHORole = isHO(user.role);
    const [lno, setLno] = useState("");
    const [amt, setAmt] = useState("");
    const [dt, setDt] = useState(today());
    const [meth, setMeth] = useState("Cash");
    const [rcpt, setRcpt] = useState(null);
    const [err, setErr] = useState("");
    const [clearedLoan, setClearedLoan] = useState(null);
    const loan = db.loans.find(l => l.loanNo === lno.trim().toUpperCase() && ["Active", "Overdue", "Defaulted"].includes(getSt(l, db.payments)));
    const bal = loan ? getBal(loan, db.payments) : 0;
    const di = loan ? getDI(loan, db.payments) : 0;
    const allPayments = isHORole ? db.payments : db.payments.filter(p => p.branch === branch);
    function record() {
        if (!loan) {
            setErr("Loan not found or already cleared.");
            return;
        }
        const a = parseFloat(amt);
        if (!a || a <= 0) {
            setErr("Enter valid amount.");
            return;
        }
        if (a > bal + di + 0.01) {
            setErr(`Exceeds total owed: ${fmt(bal + di)}`);
            return;
        }
        setErr("");
        const newBalance = Math.max(0, bal - a);
        const r = { id: `RCP-${pad(db.payments.length + 1)}`, loanNo: loan.loanNo, clientId: loan.clientId, name: loan.name, branch, amount: a, date: dt, method: meth, recordedBy: user.name, totalDue: loan.totalDue, newBalance };
        const nd = { ...db, payments: [...db.payments, r] };
        saveDB(nd);
        setDb(nd);
        setRcpt(r);
        if (newBalance <= 0) {
            const client = nd.clients.find(c => c.id === loan.clientId);
            setClearedLoan({ loan, client });
        }
        setLno("");
        setAmt("");
        setDt(today());
    }
    function printRcpt(r) {
        const kf = n => "K " + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const w = window.open("", "_blank", "width=400,height=680");
        if (!w)
            return;
        w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${r.id}</title><style>body{font-family:Arial;padding:24px;max-width:330px;margin:0 auto;font-size:13px}.hdr{text-align:center;margin-bottom:16px}h2{color:#0F2D5C;font-size:15px;margin:6px 0 2px}.sub{color:#888;font-size:11px}hr{border:none;border-top:1px dashed #ccc;margin:12px 0}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f5f5f5}.lb{color:#888}.vl{font-weight:700}.amt{font-size:18px;font-weight:800;color:#FF6F00}.bal{font-weight:700;color:${r.newBalance <= 0 ? "#2E7D32" : "#C62828"}}.ft{text-align:center;font-size:10px;color:#888;margin-top:20px;line-height:1.6}@media print{.np{display:none}}</style></head><body>
    <div class="hdr">${LSVG}<h2>PALIAN MONEY LENDING LIMITED</h2><div class="sub">Payment Receipt — ${r.branch || ""}</div></div>
    <hr><div class="row"><span class="lb">Receipt No.</span><span class="vl">${r.id}</span></div><div class="row"><span class="lb">Date</span><span class="vl">${r.date}</span></div><div class="row"><span class="lb">Loan No.</span><span class="vl">${r.loanNo}</span></div><div class="row"><span class="lb">Client</span><span class="vl">${r.name}</span></div><div class="row"><span class="lb">Method</span><span class="vl">${r.method}</span></div>
    <hr><div class="row"><span class="lb">Total Due</span><span class="vl">${kf(r.totalDue)}</span></div><div class="row"><span class="lb">Amount Paid</span><span class="vl amt">${kf(r.amount)}</span></div><div class="row"><span class="lb">Balance</span><span class="bal">${r.newBalance <= 0 ? "✅ CLEARED" : kf(r.newBalance)}</span></div>
    <hr><div class="row"><span class="lb">Recorded By</span><span class="vl">${r.recordedBy}</span></div>
    <div class="ft">Thank you for your payment!<br>Authorized Signature: _________________________</div>
    <br><button class="np" onclick="window.print()" style="width:100%;padding:11px;background:#0F2D5C;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700;">🖨️ Print</button></body></html>`);
        w.document.close();
    }
    return (React.createElement("div", null,
        React.createElement(Card, null,
            React.createElement(ST, null, "Record Payment"),
            err && React.createElement(Alrt, { type: "error" }, err),
            rcpt && React.createElement(Alrt, { type: "success" },
                "\u2705 ",
                rcpt.id,
                " \u2014 ",
                fmt(rcpt.amount),
                " ",
                React.createElement(Btn, { color: C.green, sm: true, style: { marginLeft: 10 }, onClick: () => printRcpt(rcpt) }, "\uD83D\uDDA8\uFE0F Print")),
            clearedLoan && (React.createElement("div", { style: { background: "#E8F5E9", border: `2px solid ${C.green}`, borderRadius: 14, padding: 18, marginBottom: 14 } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 } },
                    React.createElement("span", { style: { fontSize: 36 } }, "\uD83C\uDF89"),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 800, color: C.green, fontSize: 15 } }, "LOAN FULLY CLEARED!"),
                        React.createElement("div", { style: { fontSize: 12, color: C.muted } },
                            clearedLoan.loan.loanNo,
                            " \u2014 ",
                            clearedLoan.loan.name))),
                React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 } },
                    React.createElement(Btn, { color: C.green, onClick: () => openClearanceCert(clearedLoan.loan, clearedLoan.client, db) }, "\uD83D\uDCC4 Clearance Certificate"),
                    React.createElement(Btn, { color: C.blue, onClick: () => downloadClearancePDF(clearedLoan.loan, clearedLoan.client, db) }, "\u2B07\uFE0F Download PDF"),
                    React.createElement(Btn, { color: C.blue, onClick: () => onReport(clearedLoan.loan, clearedLoan.client) }, "\uD83D\uDCCB Financial Report"),
                    React.createElement(GBtn, { onClick: () => setClearedLoan(null) }, "Dismiss")),
                React.createElement("div", { style: { fontSize: 11, color: C.muted, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 10px" } }, "\uD83D\uDCA1 Financial Report opens right here in the app."))),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                React.createElement(Inp, { label: "Loan No.", req: true, value: lno, onChange: e => { setLno(e.target.value.toUpperCase()); setErr(""); }, placeholder: "LN-LSLS-0001" }),
                React.createElement(Inp, { label: "Date", req: true, type: "date", value: dt, onChange: e => setDt(e.target.value) }),
                React.createElement(Inp, { label: `Amount (K)${loan ? " — Bal: " + fmt(bal) : ""}`, req: true, type: "number", value: amt, onChange: e => setAmt(e.target.value), placeholder: "0.00" }),
                React.createElement(Sel, { label: "Method", value: meth, onChange: e => setMeth(e.target.value) },
                    React.createElement("option", null, "Cash"),
                    React.createElement("option", null, "Bank Transfer"),
                    React.createElement("option", null, "Mobile Money"),
                    React.createElement("option", null, "Cheque"))),
            loan && React.createElement(Alrt, { type: "info" },
                "Client: ",
                React.createElement("strong", null, loan.name),
                " \u00B7 ",
                loan.branch,
                " \u00B7 Bal: ",
                React.createElement("strong", { style: { color: C.red } }, fmt(bal))),
            di > 0 && React.createElement(DIBadge, { loan: loan, pmts: db.payments }),
            React.createElement(Btn, { color: C.green, full: true, onClick: record }, "\uD83D\uDCB3 Record Payment")),
        React.createElement(Card, null,
            React.createElement(ST, null, "Payment History"),
            allPayments.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 24 } }, "No payments yet.")
                : allPayments.slice().reverse().map(p => {
                    const l = db.loans.find(x => x.loanNo === p.loanNo);
                    const client = l ? db.clients.find(c => c.id === l.clientId) : null;
                    return (React.createElement("div", { key: p.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: C.navy } }, p.id),
                            React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                                p.name,
                                " \u00B7 ",
                                p.loanNo,
                                " \u00B7 ",
                                p.date),
                            React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                                p.method,
                                " \u00B7 by ",
                                p.recordedBy),
                            p.newBalance <= 0 && React.createElement("span", { style: { background: "#E8F5E9", color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 } }, "\u2705 CLEARED")),
                        React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 } },
                            React.createElement("div", { style: { fontWeight: 800, fontSize: 14, color: C.green } }, fmt(p.amount)),
                            React.createElement("div", { style: { display: "flex", gap: 4 } },
                                React.createElement(Btn, { color: C.blue, sm: true, onClick: () => printRcpt(p) }, "\uD83D\uDDA8\uFE0F"),
                                l && React.createElement(Btn, { color: C.navy, sm: true, onClick: () => onReport(l, client) }, "\uD83D\uDCCB"),
                                p.newBalance <= 0 && l && React.createElement(Btn, { color: C.green, sm: true, onClick: () => openClearanceCert(l, client, db) }, "\uD83D\uDCC4"),
                                p.newBalance <= 0 && l && React.createElement(Btn, { color: C.blue, sm: true, onClick: () => downloadClearancePDF(l, client, db) }, "\u2B07\uFE0F")))));
                }))));
}
// ── CLIENTS ───────────────────────────────────────────────────────────────────
function Clients({ db, setDb, onNewLoan, user, onReport }) {
    const isHORole = isHO(user.role);
    const canRequestDeletion = user.role === "manager" || isHORole;
    function requestDeletion(c) {
        const reason = window.prompt(`Why should ${c.name}'s record be deleted? (This will need Admin approval before anything is removed.)`);
        if (reason === null)
            return;
        const nd = { ...db, clients: db.clients.map(x => x.id === c.id ? { ...x, deletionRequested: true, deletionRequestedBy: user.name, deletionRequestedDate: new Date().toISOString(), deletionReason: reason } : x) };
        saveDB(nd);
        setDb(nd);
        alert("✅ Deletion request sent to System Admin for approval.");
    }
    const [q, setQ] = useState("");
    const [sel, setSel] = useState(null);
    const [pf, setPf] = useState("all");
    const all = db.clients.filter(c => { const mQ = c.name.toLowerCase().includes(q.toLowerCase()) || c.nrc.toLowerCase().includes(q) || (c.phone || "").includes(q); const mB = isHORole ? (pf === "all" || c.province === pf) : c.branch === user.branch; return mQ && mB; });
    if (sel) {
        const c = sel;
        const cl = db.loans.filter(l => l.clientId === c.id);
        const out = cl.reduce((s, l) => s + getBal(l, db.payments), 0);
        return (React.createElement("div", null,
            React.createElement(GBtn, { onClick: () => setSel(null), style: { marginBottom: 14 } }, "\u2190 All Clients"),
            React.createElement(Card, null,
                React.createElement("div", { style: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 } },
                    c.passportPhoto ? React.createElement("img", { src: c.passportPhoto, alt: "", style: { width: 70, height: 70, borderRadius: 12, objectFit: "cover", border: `2px solid ${C.border}`, flexShrink: 0 } }) : React.createElement("div", { style: { width: 70, height: 70, borderRadius: 12, background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 } }, "\uD83D\uDC64"),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 800, fontSize: 17, color: C.navy } }, c.name),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            "\uD83D\uDCCD ",
                            c.branch,
                            ", ",
                            c.province,
                            " \u00B7 ",
                            c.id))),
                React.createElement(IR, { label: "NRC", value: c.nrc }),
                React.createElement(IR, { label: "Phone", value: c.phone }),
                React.createElement(IR, { label: "Address", value: c.address }),
                React.createElement(IR, { label: "Employer", value: c.company || "—" }),
                React.createElement(IR, { label: "Bank", value: c.bank || "—" }),
                React.createElement(IR, { label: "Account No.", value: c.accountNo || "—" }),
                React.createElement(IR, { label: "TPIN", value: c.tpin || "—" }),
                c.nok_name && (React.createElement("div", { style: { background: "#E8F5E9", borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 6 } },
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.green, marginBottom: 6 } }, "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Next of Kin"),
                    React.createElement(IR, { label: "Name", value: c.nok_name }),
                    React.createElement(IR, { label: "Relationship", value: c.nok_relationship || "—" }),
                    React.createElement(IR, { label: "Phone", value: c.nok_phone || "—" }),
                    React.createElement(IR, { label: "Address", value: c.nok_address || "—" }))),
                React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 } },
                    c.docs?.nrcPhoto && React.createElement("img", { src: c.docs.nrcPhoto, alt: "NRC", style: { width: 50, height: 50, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` } }),
                    c.docs?.payslip && React.createElement("img", { src: c.docs.payslip, alt: "Payslip", style: { width: 50, height: 50, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` } }),
                    c.docs?.bankStatement && React.createElement("img", { src: c.docs.bankStatement, alt: "Bank Stmt", style: { width: 50, height: 50, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` } })),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "16px 0" } },
                    React.createElement(StatCard, { label: "Loans", value: cl.length, color: C.navy }),
                    React.createElement(StatCard, { label: "Outstanding", value: fmt(out), color: C.red, small: true }),
                    React.createElement(StatCard, { label: "Cleared", value: cl.filter(l => getSt(l, db.payments) === "Cleared").length, color: C.green })),
                React.createElement(ST, null, "Loan History"),
                cl.length === 0 ? React.createElement("p", { style: { color: C.muted } }, "No loans yet.") : cl.map(l => {
                    const st = getSt(l, db.payments);
                    return (React.createElement("div", { key: l.loanNo, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 } },
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                            React.createElement("strong", { style: { color: C.navy } }, l.loanNo),
                            React.createElement(Badge, { s: st })),
                        React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" } },
                            React.createElement(Btn, { sm: true, color: C.navy, onClick: () => onReport(l, c) }, "\uD83D\uDCCB Financial Report"),
                            st === "Cleared" && React.createElement(Btn, { sm: true, color: C.green, onClick: () => openClearanceCert(l, c, db) }, "\uD83D\uDCC4 Certificate"),
                            st === "Cleared" && React.createElement(Btn, { sm: true, color: C.blue, onClick: () => downloadClearancePDF(l, c, db) }, "\u2B07\uFE0F Download")),
                        st === "Defaulted" && React.createElement(DIBadge, { loan: l, pmts: db.payments }),
                        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 } }, [["Type", l.type], ["Principal", fmt(l.principal)], ["Total Due", fmt(l.totalDue)], ["Balance", fmt(getBal(l, db.payments))], ["Due Date", l.dueDate || "—"], ["Approved By", l.approvedBy || "Pending"]].map(([lb, v]) => (React.createElement("div", { key: lb },
                            React.createElement("div", { style: { color: C.muted, fontSize: 10, fontWeight: 600 } }, lb),
                            React.createElement("div", { style: { fontWeight: 700 } }, v)))))));
                }),
                React.createElement(Btn, { color: C.orange, full: true, style: { marginTop: 10 }, onClick: () => onNewLoan(c.nrc) },
                    "\u2795 Add New Loan for ",
                    c.name),
                c.deletionRequested && React.createElement(Alrt, { type: "warn" },
                    "\u26A0\uFE0F Deletion requested by ", c.deletionRequestedBy, " on ", c.deletionRequestedDate ? new Date(c.deletionRequestedDate).toLocaleDateString() : "—",
                    " \u2014 awaiting System Admin approval.", c.deletionReason ? ` Reason: "${c.deletionReason}"` : ""),
                !c.deletionRequested && canRequestDeletion && React.createElement(Btn, { color: C.red, full: true, style: { marginTop: 10 }, onClick: () => requestDeletion(c) }, "\uD83D\uDDD1\uFE0F Request Deletion (needs Admin approval)"))));
    }
    return (React.createElement(Card, null,
        React.createElement(ST, null,
            "Clients (",
            all.length,
            ")"),
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" } },
            React.createElement("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "Search name, NRC, phone...", style: { flex: 1, minWidth: 150, ...iSt } }),
            isHORole && React.createElement("select", { value: pf, onChange: e => setPf(e.target.value), style: { ...iSt, maxWidth: 160 } },
                React.createElement("option", { value: "all" }, "All Provinces"),
                Object.keys(PROVINCES).map(p => React.createElement("option", { key: p }, p)))),
        all.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 32 } },
            React.createElement("div", { style: { fontSize: 40 } }, "\uD83D\uDC65"),
            React.createElement("p", null, db.clients.length === 0 ? "No clients yet." : "No results."))
            : all.map(c => {
                const cl = db.loans.filter(l => l.clientId === c.id);
                const out = cl.reduce((s, l) => s + getBal(l, db.payments), 0);
                return (React.createElement("div", { key: c.id, onClick: () => setSel(c), style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" } },
                    c.passportPhoto ? React.createElement("img", { src: c.passportPhoto, alt: "", style: { width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 } }) : React.createElement("div", { style: { width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 } }, "\uD83D\uDC64"),
                    React.createElement("div", { style: { flex: 1 } },
                        React.createElement("div", { style: { fontWeight: 700, color: C.navy } }, c.name),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            c.id,
                            " \u00B7 ",
                            c.nrc),
                        c.nok_name && React.createElement("div", { style: { fontSize: 10, color: C.teal, fontWeight: 600 } },
                            "NOK: ",
                            c.nok_name),
                        isHORole && React.createElement("div", { style: { fontSize: 10, color: C.blue, fontWeight: 600 } },
                            "\uD83D\uDCCD ",
                            c.branch,
                            ", ",
                            c.province)),
                    React.createElement("div", { style: { textAlign: "right" } },
                        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: C.blue } },
                            cl.length,
                            " loan",
                            cl.length !== 1 ? "s" : ""),
                        out > 0 && React.createElement("div", { style: { fontSize: 11, color: C.red, fontWeight: 700 } }, fmt(out)))));
            })));
}
// ── ALL LOANS ─────────────────────────────────────────────────────────────────
function AllLoans({ db, user, onReport }) {
    const isHORole = isHO(user.role);
    const [q, setQ] = useState("");
    const [sf, setSf] = useState("");
    const [pf, setPf] = useState("all");
    const filtered = db.loans.filter(l => { const st = getSt(l, db.payments); const mB = isHORole ? (pf === "all" || l.province === pf) : l.branch === user.branch; return (l.name.toLowerCase().includes(q.toLowerCase()) || l.nrc.includes(q) || l.loanNo.includes(q)) && (!sf || st === sf) && mB; });
    return (React.createElement(Card, null,
        React.createElement(ST, null,
            "All Loans (",
            filtered.length,
            ")"),
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" } },
            React.createElement("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "Search...", style: { flex: 1, minWidth: 130, ...iSt } }),
            React.createElement("select", { value: sf, onChange: e => setSf(e.target.value), style: { ...iSt, maxWidth: 120 } },
                React.createElement("option", { value: "" }, "All Status"),
                React.createElement("option", null, "Active"),
                React.createElement("option", null, "Overdue"),
                React.createElement("option", null, "Defaulted"),
                React.createElement("option", null, "Cleared"),
                React.createElement("option", null, "Pending")),
            isHORole && React.createElement("select", { value: pf, onChange: e => setPf(e.target.value), style: { ...iSt, maxWidth: 150 } },
                React.createElement("option", { value: "all" }, "All Provinces"),
                Object.keys(PROVINCES).map(p => React.createElement("option", { key: p }, p)))),
        filtered.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 28 } }, "No loans found.")
            : filtered.slice().reverse().map(l => {
                const st = getSt(l, db.payments);
                const client = db.clients.find(c => c.id === l.clientId);
                return (React.createElement("div", { key: l.loanNo, style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 13, marginBottom: 10 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("div", null,
                            React.createElement("strong", { style: { color: C.navy, fontSize: 14 } }, l.loanNo),
                            isHORole && React.createElement("span", { style: { fontSize: 10, color: C.blue, marginLeft: 6 } },
                                "\uD83D\uDCCD",
                                l.branch)),
                        React.createElement(Badge, { s: st })),
                    st === "Defaulted" && React.createElement(DIBadge, { loan: l, pmts: db.payments }),
                    React.createElement("div", { style: { fontSize: 13, marginBottom: 8 } },
                        React.createElement("strong", null, l.name),
                        " \u00B7 ",
                        l.nrc,
                        " \u00B7 ",
                        l.type),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 10 } }, [["Principal", fmt(l.principal)], ["Total Due", fmt(l.totalDue)], ["Balance", fmt(getBal(l, db.payments))], ["Total Owed", fmt(getTotalOwed(l, db.payments))], ["Consultant", l.consultant], ["Due Date", l.dueDate || "—"]].map(([lb, v]) => (React.createElement("div", { key: lb },
                        React.createElement("div", { style: { color: C.muted, fontWeight: 600, fontSize: 10 } }, lb),
                        React.createElement("div", { style: { fontWeight: 700 } }, v))))),
                    React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                        React.createElement(Btn, { sm: true, color: C.navy, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Financial Report"),
                        st === "Cleared" && React.createElement(Btn, { sm: true, color: C.green, onClick: () => openClearanceCert(l, client, db) }, "\uD83D\uDCC4 Clearance Cert"),
                        st === "Cleared" && React.createElement(Btn, { sm: true, color: C.blue, onClick: () => downloadClearancePDF(l, client, db) }, "\u2B07\uFE0F Download"))));
            })));
}
// ── HR SYSTEM ─────────────────────────────────────────────────────────────────
function Notifications({ db, user, onReport }) {
    const isHORole = isHO(user.role);
    const loans = isHORole ? db.loans : bL(db, user.branch);
    const payments = isHORole ? db.payments : bP(db, user.branch);
    const due7 = loans.filter(l => { if (!l.dueDate || getSt(l, payments) !== "Active")
        return false; const d = Math.floor((new Date(l.dueDate) - new Date()) / 86400000); return d >= 0 && d <= 7; });
    const ov = loans.filter(l => ["Overdue", "Defaulted"].includes(getSt(l, payments)));
    function copySMS(l, type) { const msg = type === "due" ? `Dear ${l.name}, your loan ${l.loanNo} of ${fmt(l.totalDue)} is due on ${l.dueDate}. Outstanding: ${fmt(getBal(l, payments))}. Please pay promptly. Palian Money Lending Ltd — ${l.branch}.` : `Dear ${l.name}, loan ${l.loanNo} is OVERDUE. Balance: ${fmt(getBal(l, payments))}. Default interest: 5% per 7 days. Total owed: ${fmt(getTotalOwed(l, payments))}. Contact us urgently. Palian Money Lending Ltd.`; navigator.clipboard?.writeText(msg).then(() => alert("✅ Copied!")).catch(() => prompt("Copy:", msg)); }
    return (React.createElement("div", null,
        React.createElement(Card, { style: { borderLeft: `4px solid ${C.amber}` } },
            React.createElement(ST, { color: C.amber },
                "\uD83D\uDCC5 Due in 7 Days (",
                due7.length,
                ")"),
            due7.length === 0 ? React.createElement(Alrt, { type: "success" }, "No loans due in 7 days.") : due7.map(l => { const days = Math.floor((new Date(l.dueDate) - new Date()) / 86400000); const client = db.clients.find(c => c.id === l.clientId); return (React.createElement("div", { key: l.loanNo, style: { border: `1px solid ${C.amber}`, borderRadius: 10, padding: 12, marginBottom: 8, background: "#FFF8E1" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                    React.createElement("strong", { style: { color: C.navy } },
                        l.loanNo,
                        " \u2014 ",
                        l.name),
                    React.createElement("span", { style: { background: C.amber, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 } },
                        "Due in ",
                        days,
                        "d")),
                React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 8 } },
                    "Bal: ",
                    React.createElement("strong", null, fmt(getBal(l, payments))),
                    " \u00B7 Due: ",
                    l.dueDate),
                React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                    React.createElement(Btn, { sm: true, color: C.amber, onClick: () => copySMS(l, "due") }, "\uD83D\uDCCB Copy SMS"),
                    React.createElement(Btn, { sm: true, color: C.navy, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Report")))); })),
        React.createElement(Card, { style: { borderLeft: `4px solid ${C.red}` } },
            React.createElement(ST, { color: C.red },
                "\u26A0\uFE0F Overdue (",
                ov.length,
                ")"),
            ov.length === 0 ? React.createElement(Alrt, { type: "success" }, "No overdue loans.") : ov.map(l => { const client = db.clients.find(c => c.id === l.clientId); return (React.createElement("div", { key: l.loanNo, style: { border: `1px solid ${C.red}`, borderRadius: 10, padding: 12, marginBottom: 8, background: "#FFEBEE" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                    React.createElement("strong", { style: { color: C.navy } },
                        l.loanNo,
                        " \u2014 ",
                        l.name),
                    React.createElement(Badge, { s: getSt(l, payments) })),
                React.createElement(DIBadge, { loan: l, pmts: payments }),
                React.createElement("div", { style: { fontSize: 11, color: C.muted, marginBottom: 8 } },
                    "Phone: ",
                    client?.phone || "—"),
                React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                    React.createElement(Btn, { sm: true, color: C.red, onClick: () => copySMS(l, "overdue") }, "\uD83D\uDCCB Copy SMS"),
                    React.createElement(Btn, { sm: true, color: C.navy, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Report")))); }))));
}
// ── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({ db, user, onReport }) {
    const [q, setQ] = useState("");
    const isHORole = isHO(user.role);
    const loans = isHORole ? db.loans : bL(db, user.branch);
    const payments = isHORole ? db.payments : bP(db, user.branch);
    const clients = isHORole ? db.clients : bC(db, user.branch);
    const tC = payments.reduce((s, p) => s + p.amount, 0);
    const tDue = loans.reduce((s, l) => s + l.totalDue, 0);
    const tOut = loans.reduce((s, l) => s + getBal(l, payments), 0);
    const rec = tDue > 0 ? (tC / tDue * 100).toFixed(1) : 0;
    const stC = s => loans.filter(l => getSt(l, payments) === s).length;
    const totalDI = loans.filter(l => getSt(l, payments) === "Defaulted").reduce((s, l) => s + getDI(l, payments), 0);
    const searched = q ? loans.filter(l => l.name.toLowerCase().includes(q.toLowerCase()) || l.nrc.includes(q) || l.loanNo.includes(q.toUpperCase())) : [];
    return (React.createElement("div", null,
        React.createElement(Card, null,
            React.createElement(ST, null, "\uD83D\uDCCA Portfolio Summary"),
            [["Clients", clients.length], ["Total Loans", loans.length], ["Total Collected", fmt(tC)], ["Outstanding", fmt(tOut)], ["Recovery Rate", rec + "%"], ["Active", stC("Active")], ["Overdue", stC("Overdue")], ["Defaulted", stC("Defaulted")], ["Cleared", stC("Cleared")], ["Default Interest Accrued", fmt(totalDI)]].map(([l, v]) => React.createElement(IR, { key: l, label: l, value: v })),
            totalDI > 0 && React.createElement(Alrt, { type: "warn" },
                "\u26A0\uFE0F ",
                fmt(totalDI),
                " in auto-accrued default interest (5% per 7 days) on defaulted loans."),
            React.createElement(Btn, { sm: true, color: C.green, style: { marginTop: 10 }, onClick: () => window.print() }, "\uD83D\uDDA8\uFE0F Print Summary")),
        React.createElement(Card, null,
            React.createElement(ST, { color: C.blue }, "\uD83D\uDCCB Generate Financial Report"),
            React.createElement(Alrt, { type: "success" }, "\u2705 Financial Reports now open directly in the app \u2014 no popup needed. Works on all phones."),
            React.createElement(Inp, { label: "Search by client name, NRC, or Loan No.", placeholder: "Type to search...", value: q, onChange: e => setQ(e.target.value) }),
            !q && React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Type a name, NRC, or loan number above to find a loan and generate its financial report."),
            q && searched.length === 0 && React.createElement("p", { style: { color: C.muted, fontSize: 13 } },
                "No results found for \"",
                q,
                "\"."),
            searched.map(l => {
                const client = db.clients.find(c => c.id === l.clientId);
                const st = getSt(l, payments);
                return (React.createElement("div", { key: l.loanNo, style: { border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("div", null,
                            React.createElement("strong", { style: { color: C.navy } }, l.loanNo),
                            React.createElement("span", { style: { fontSize: 11, color: C.muted, marginLeft: 8 } },
                                l.name,
                                isHORole ? ` · 📍${l.branch}` : "")),
                        React.createElement(Badge, { s: st })),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, marginBottom: 10 } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { color: C.muted, fontWeight: 600, fontSize: 10 } }, "Principal"),
                            React.createElement("div", { style: { fontWeight: 700 } }, fmt(l.principal))),
                        React.createElement("div", null,
                            React.createElement("div", { style: { color: C.muted, fontWeight: 600, fontSize: 10 } }, "Balance"),
                            React.createElement("div", { style: { fontWeight: 700, color: C.red } }, fmt(getBal(l, payments)))),
                        React.createElement("div", null,
                            React.createElement("div", { style: { color: C.muted, fontWeight: 600, fontSize: 10 } }, "Total Owed"),
                            React.createElement("div", { style: { fontWeight: 700, color: C.red } }, fmt(getTotalOwed(l, payments)))),
                        React.createElement("div", null,
                            React.createElement("div", { style: { color: C.muted, fontWeight: 600, fontSize: 10 } }, "Days OD"),
                            React.createElement("div", { style: { fontWeight: 700 } }, getDOD(l) > 0 ? getDOD(l) + " days" : "—"))),
                    st === "Defaulted" && React.createElement(DIBadge, { loan: l, pmts: payments }),
                    React.createElement(Btn, { color: C.navy, full: true, onClick: () => onReport(l, client) }, "\uD83D\uDCCB Open Financial Report")));
            }))));
}
// ── EXPORT ────────────────────────────────────────────────────────────────────
function Export({ db, user }) {
    const isHORole = isHO(user.role);
    const loans = isHORole ? db.loans : bL(db, user.branch);
    const payments = isHORole ? db.payments : bP(db, user.branch);
    const clients = isHORole ? db.clients : bC(db, user.branch);
    function expAll() { const rows = [["PALIAN FULL EXPORT — " + today()], [], ["=== CLIENTS ==="], ["ID", "Name", "NRC", "Phone", "Branch", "Province", "Address", "Employer", "Bank", "Account", "TPIN", "NOK Name", "NOK Phone", "NOK Relationship"]]; clients.forEach(c => rows.push([c.id, c.name, c.nrc, c.phone, c.branch, c.province, c.address, c.company, c.bank, c.accountNo, c.tpin, c.nok_name, c.nok_phone, c.nok_relationship])); rows.push([], ["=== LOANS ==="], ["Loan No.", "Client", "NRC", "Branch", "Type", "Principal", "Total Due", "Paid", "Balance", "Default Interest", "Total Owed", "Status", "Due Date"]); loans.forEach(l => { const paid = payments.filter(p => p.loanNo === l.loanNo).reduce((s, p) => s + p.amount, 0); rows.push([l.loanNo, l.name, l.nrc, l.branch, l.type, l.principal, l.totalDue, paid, Math.max(0, l.totalDue - paid), getDI(l, payments), getTotalOwed(l, payments), getSt(l, payments), l.dueDate]); }); rows.push([], ["=== PAYMENTS ==="], ["Receipt", "Loan No.", "Client", "Branch", "Amount", "Date", "Method", "Balance After"]); payments.forEach(p => rows.push([p.id, p.loanNo, p.name, p.branch, p.amount, p.date, p.method, p.newBalance])); const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `Palian_Export_${today()}.csv`; a.click(); }
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.green},#388E3C)`, color: "#fff", padding: 18, marginBottom: 14 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                React.createElement(PalianLogo, { size: 36 }),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 15, fontWeight: 800 } }, "Export Data"),
                    React.createElement("div", { style: { fontSize: 11, opacity: 0.85 } }, "Download CSV for Excel")))),
        React.createElement(Card, null,
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 } },
                React.createElement(StatCard, { label: "Clients", value: clients.length, color: C.navy, icon: "\uD83D\uDC65" }),
                React.createElement(StatCard, { label: "Loans", value: loans.length, color: C.blue, icon: "\uD83D\uDCCB" }),
                React.createElement(StatCard, { label: "Payments", value: payments.length, color: C.green, icon: "\uD83D\uDCB3" }),
                React.createElement(StatCard, { label: "Disbursed", value: fmt(loans.reduce((s, l) => s + l.principal, 0)), color: C.teal, icon: "\uD83D\uDCB0", small: true })),
            React.createElement(Btn, { full: true, color: C.purple, onClick: expAll }, "\uD83D\uDCE6 Download Full Export (CSV)"),
            React.createElement("div", { style: { marginTop: 12, padding: 12, background: C.light, borderRadius: 10, fontSize: 12, color: C.muted } }, "\uD83D\uDCA1 Open CSV in Excel \u2192 File \u2192 Save As \u2192 .xlsx. For full backup/restore, use the \uD83D\uDCBE Backup tab."))));
}
// ── AI ADVISER ────────────────────────────────────────────────────────────────
function AIAdviser({ db }) {
    const [msgs, setMsgs] = useState([{ role: "assistant", text: "Hi! I'm your Palian AI Adviser. Ask about loans, defaulters, branch performance, payslips, or Zambian microfinance." }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef();
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
    async function send() {
        if (!input.trim() || loading)
            return;
        const msg = input.trim();
        setInput("");
        setLoading(true);
        setMsgs(m => [...m, { role: "user", text: msg }]);
        try {
            const ctx = `Palian Money Lending Ltd, Zambia. ${db.clients.length} clients, ${db.loans.length} loans. Default interest: 5% per 7 days. Interest rates: 20%,23%,25%,30%,35%. Be concise.`;
            const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, system: ctx, messages: [...msgs.filter((_, i) => i > 0).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })), { role: "user", content: msg }] }) });
            const data = await res.json();
            setMsgs(m => [...m, { role: "assistant", text: data.content?.[0]?.text || "Try again." }]);
        }
        catch {
            setMsgs(m => [...m, { role: "assistant", text: "Connection error. Check internet." }]);
        }
        setLoading(false);
    }
    const sug = ["How does default interest work?", "Best collateral in Zambia?", "How to improve recovery rate?", "Zambia PAYE tax bands?"];
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.purple},#9C27B0)`, color: "#fff", padding: 16, marginBottom: 14 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
                React.createElement("div", { style: { fontSize: 32 } }, "\uD83E\uDD16"),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 15 } }, "AI Loan Adviser"),
                    React.createElement("div", { style: { fontSize: 11, opacity: 0.8 } }, "Powered by Claude AI")))),
        React.createElement(Card, { style: { padding: 0, overflow: "hidden" } },
            React.createElement("div", { style: { height: 300, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 } },
                msgs.map((m, i) => React.createElement("div", { key: i, style: { display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" } },
                    React.createElement("div", { style: { maxWidth: "86%", background: m.role === "user" ? `linear-gradient(135deg,${C.navy},${C.blue})` : "#F5F7FA", color: m.role === "user" ? "#fff" : C.text, borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 } }, m.text))),
                loading && React.createElement("div", { style: { display: "flex", gap: 5, padding: "10px 14px", background: "#F5F7FA", borderRadius: "14px 14px 14px 4px", width: 64, alignItems: "center" } }, [0, 1, 2].map(i => React.createElement("div", { key: i, style: { width: 7, height: 7, borderRadius: "50%", background: C.muted, animation: `bounce 1.2s ${i * 0.2}s infinite` } }))),
                React.createElement("div", { ref: endRef })),
            React.createElement("div", { style: { borderTop: `1px solid ${C.border}`, padding: 10 } },
                React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 } }, sug.map(s => React.createElement("button", { key: s, onClick: () => setInput(s), style: { background: C.light, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: C.navy, fontWeight: 600 } }, s))),
                React.createElement("div", { style: { display: "flex", gap: 8 } },
                    React.createElement("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === "Enter" && send(), placeholder: "Ask anything...", style: { ...iSt, margin: 0, flex: 1 } }),
                    React.createElement(Btn, { onClick: send, disabled: !input.trim() || loading, color: C.purple, style: { padding: "10px 16px", flexShrink: 0 } }, "Send"))))));
}
// ── LEAVE REQUEST ─────────────────────────────────────────────────────────────
function LeaveRequest({ db, setDb, user }) {
    const [lf, setLf] = useState({ type: "Annual Leave", from: "", to: "", reason: "" });
    const myLeave = (db.leaveRequests || []).filter(r => r.staffName === user.name);
    function submit() { if (!lf.from || !lf.to || !lf.reason) {
        alert("Fill all fields.");
        return;
    } const r = { id: `LV-${pad((db.leaveRequests || []).length + 1)}`, staffName: user.name, branch: user.branch, type: lf.type, from: lf.from, to: lf.to, reason: lf.reason, status: "Pending", submittedDate: today(), approvedBy: "" }; const nd = { ...db, leaveRequests: [...(db.leaveRequests || []), r] }; saveDB(nd); setDb(nd); setLf({ type: "Annual Leave", from: "", to: "", reason: "" }); alert("✅ Leave submitted."); }
    return (React.createElement("div", null,
        React.createElement(Card, null,
            React.createElement(ST, { color: C.teal }, "\uD83C\uDFD6\uFE0F Submit Leave Request"),
            React.createElement(Sel, { label: "Leave Type", value: lf.type, onChange: e => setLf(f => ({ ...f, type: e.target.value })) },
                React.createElement("option", null, "Annual Leave"),
                React.createElement("option", null, "Sick Leave"),
                React.createElement("option", null, "Maternity Leave"),
                React.createElement("option", null, "Paternity Leave"),
                React.createElement("option", null, "Emergency Leave"),
                React.createElement("option", null, "Study Leave")),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                React.createElement(Inp, { label: "From", req: true, type: "date", value: lf.from, onChange: e => setLf(f => ({ ...f, from: e.target.value })) }),
                React.createElement(Inp, { label: "To", req: true, type: "date", value: lf.to, onChange: e => setLf(f => ({ ...f, to: e.target.value })) })),
            React.createElement(Inp, { label: "Reason", req: true, value: lf.reason, onChange: e => setLf(f => ({ ...f, reason: e.target.value })) }),
            React.createElement(Btn, { color: C.teal, full: true, onClick: submit }, "\uD83D\uDCE4 Submit Leave Request")),
        React.createElement(Card, null,
            React.createElement(ST, null, "My Leave History"),
            myLeave.length === 0 ? React.createElement("p", { style: { color: C.muted } }, "No leave requests yet.") : myLeave.map(r => (React.createElement("div", { key: r.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 700 } }, r.type),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            r.from,
                            " to ",
                            r.to)),
                    React.createElement("span", { style: { background: r.status === "Approved" ? C.green : r.status === "Rejected" ? C.red : C.gold, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 } }, r.status)),
                React.createElement("div", { style: { fontSize: 12, color: C.muted } },
                    "Reason: ",
                    r.reason)))))));
}
// ── INSTALL ───────────────────────────────────────────────────────────────────
function Install() {
    const [canInstall, setCanInstall] = useState(false);
    const [installed, setInstalled] = useState(false);
    const promptRef = useRef(null);
    useEffect(() => { const h = e => { e.preventDefault(); promptRef.current = e; setCanInstall(true); }; window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", () => { setInstalled(true); setCanInstall(false); }); return () => window.removeEventListener("beforeinstallprompt", h); }, []);
    async function doInstall() { if (!promptRef.current)
        return; promptRef.current.prompt(); const r = await promptRef.current.userChoice; if (r.outcome === "accepted") {
        setInstalled(true);
        setCanInstall(false);
    } promptRef.current = null; }
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, color: "#fff", textAlign: "center", padding: 32 } },
            React.createElement(PalianLogo, { size: 64 }),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 20, marginBottom: 6, marginTop: 10 } }, "Install Palian App"),
            React.createElement("div", { style: { fontSize: 13, opacity: 0.8, marginBottom: 24 } }, "Works offline \u00B7 Data saves automatically"),
            installed ? React.createElement("div", { style: { background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 14, fontWeight: 700 } }, "\u2705 Installed!") : canInstall ? React.createElement(Btn, { onClick: doInstall, color: C.orange, style: { fontSize: 16, padding: "14px 36px" } }, "\u2B07\uFE0F Install Now") : React.createElement("div", { style: { background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 14, fontSize: 13 } }, "Use the steps below.")),
        React.createElement(Card, null,
            React.createElement(ST, null, "\uD83D\uDCF1 Phone"),
            React.createElement("div", { style: { fontSize: 13, color: C.navy, marginBottom: 10 } },
                React.createElement("strong", null, "Android:"),
                " Chrome menu (\u22EE) \u2192 Add to Home Screen \u2192 Add"),
            React.createElement("div", { style: { fontSize: 13, color: C.navy } },
                React.createElement("strong", null, "iPhone:"),
                " Share (\uD83D\uDCE4) \u2192 Add to Home Screen \u2192 Add")),
        React.createElement(Card, null,
            React.createElement(ST, null, "\uD83D\uDCBB Desktop"),
            React.createElement("div", { style: { fontSize: 13, color: C.navy } }, "Chrome/Edge: click install icon (\u2295) at right of address bar \u2192 Install"))));
}
// ── PARCEL / TRANSPORT DATA HELPERS ───────────────────────────────────────────
const PSC = { Booked: C.blue, "In Transit": C.amber, Arrived: C.teal, Collected: C.green };
function statusLabel(s) { return { Booked: "Sent", "In Transit": "In Transit", Arrived: "Delivered", Collected: "Received" }[s] || s; }
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) {
        u8[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8], { type: mime });
}
async function uploadParcelPhoto(dataUrl, trackingNo) {
    if (!dataUrl)
        return null;
    try {
        const blob = dataURLtoBlob(dataUrl);
        const path = `parcel-photos/${trackingNo}.jpg`;
        const { error } = await sb.storage.from("parcels").upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) {
            console.error(error);
            return null;
        }
        const { data } = sb.storage.from("parcels").getPublicUrl(path);
        return data.publicUrl;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
async function loadParcels() {
    try {
        const { data } = await sb.from("parcels").select("*").order("booked_date", { ascending: false });
        return data || [];
    }
    catch (e) {
        console.error(e);
        return [];
    }
}
async function saveParcelRow(row) {
    try {
        await sb.from("parcels").upsert([row]);
    }
    catch (e) {
        console.error(e);
    }
}
function smsLink(phone, msg) { return `sms:${(phone || "").replace(/\s+/g, "")}?body=${encodeURIComponent(msg)}`; }

// ── PTD PRICING / FINANCE DATA HELPERS ────────────────────────────────────────
async function loadRoutePrices() {
    try { const { data } = await sb.from("route_prices").select("*"); return data || []; }
    catch (e) { console.error(e); return []; }
}
async function lookupRoutePrice(origin, dest, serviceType) {
    try {
        const { data } = await sb.from("route_prices").select("*").eq("origin_town", origin).eq("dest_town", dest).eq("service_type", serviceType).maybeSingle();
        return data || null;
    } catch (e) { console.error(e); return null; }
}
async function saveRoutePrice(row) {
    try { await sb.from("route_prices").upsert([row], { onConflict: "origin_town,dest_town,service_type" }); }
    catch (e) { console.error(e); }
}
async function loadPayrollBudget() {
    try { const { data } = await sb.from("payroll_budget").select("*").eq("id", 1).maybeSingle(); return data?.total_budget || 0; }
    catch (e) { console.error(e); return 0; }
}
async function savePayrollBudget(amount, user) {
    try { await sb.from("payroll_budget").upsert([{ id: 1, total_budget: amount, updated_by: user.name, updated_at: new Date().toISOString() }]); }
    catch (e) { console.error(e); }
}
async function loadStatutory() {
    try { const { data } = await sb.from("statutory_obligations").select("*").order("created_at", { ascending: true }); return data || []; }
    catch (e) { console.error(e); return []; }
}
async function saveStatutory(row) {
    try { await sb.from("statutory_obligations").upsert([row]); }
    catch (e) { console.error(e); }
}
async function addStatutory(name, user) {
    try { await sb.from("statutory_obligations").insert([{ name, amount_due: 0, amount_paid: 0, added_by: user.name }]); }
    catch (e) { console.error(e); }
}
// ── SYSTEM SELECT ──────────────────────────────────────────────────────────────
function SystemSelect({ user, onSelect, onLogout }) {
    return (React.createElement("div", { style: { minHeight: "100vh", background: `linear-gradient(160deg,${C.navy},${C.blue})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 } },
        React.createElement(PalianLogo, { size: 64 }),
        React.createElement("div", { style: { color: "#fff", fontWeight: 900, fontSize: 18, marginTop: 12 } }, "PALIAN"),
        React.createElement("div", { style: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 32 } },
            "Welcome, ",
            user.name,
            " \u2014 choose a system"),
        React.createElement("div", { style: { width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 } },
            React.createElement("button", { onClick: () => onSelect("loans"), style: { background: "#fff", border: "none", borderRadius: 16, padding: "26px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" } },
                React.createElement("div", { style: { fontSize: 34 } }, "\uD83D\uDCB0"),
                React.createElement("div", { style: { textAlign: "left" } },
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 16, color: C.navy } }, "Loans & Money"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted } }, "Clients, loans, payments, reports"))),
            React.createElement("button", { onClick: () => onSelect("transport"), style: { background: "#fff", border: "none", borderRadius: 16, padding: "26px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" } },
                React.createElement("div", { style: { fontSize: 34 } }, "\uD83D\uDCE6"),
                React.createElement("div", { style: { textAlign: "left" } },
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 16, color: C.navy } }, "PTD"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted } }, "Palian Transport & Delivery \u2014 parcels, shifting")))),
        React.createElement("button", { onClick: onLogout, style: { background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 32, cursor: "pointer" } }, "Logout")));
}
// ── NEW PARCEL FORM ────────────────────────────────────────────────────────────
function NewParcelForm({ user, onBooked }) {
    const originInfo = isHO(user.role) ? null : gBI(user.branch);
    const [originProvince, setOriginProvince] = useState(originInfo ? originInfo.province : "");
    const [originTown, setOriginTown] = useState(isHO(user.role) ? "" : user.branch);
    const [destProvince, setDestProvince] = useState("");
    const [destTown, setDestTown] = useState("");
    const [serviceType, setServiceType] = useState("Parcel");
    const [homeDelivery, setHomeDelivery] = useState(false);
    const [routePrice, setRoutePrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [f, setF] = useState({ senderName: "", senderNrc: "", senderPhone: "", receiverName: "", receiverPhone: "", description: "", vehiclePlate: "", driverName: "" });
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
    useEffect(() => {
        if (originTown && destTown) {
            setPriceLoading(true);
            lookupRoutePrice(originTown, destTown, serviceType).then(r => { setRoutePrice(r); setPriceLoading(false); });
        }
        else
            setRoutePrice(null);
    }, [originTown, destTown, serviceType]);
    const basePrice = routePrice?.price || 0;
    const hdFee = homeDelivery ? (routePrice?.home_delivery_fee || 0) : 0;
    const totalPrice = basePrice + hdFee;
    async function submit() {
        if (!originTown || !destTown) {
            alert("Select origin and destination town.");
            return;
        }
        if (!f.senderName || !f.senderNrc || !f.receiverName || !f.receiverPhone) {
            alert("Fill sender name, sender NRC, receiver name, and receiver phone.");
            return;
        }
        if (!validNRC(f.senderNrc.trim().toUpperCase())) {
            alert("Sender NRC format: 123456/78/1");
            return;
        }
        setBusy(true);
        const oInfo = gBI(originTown), dInfo = gBI(destTown);
        const seq = pad(Math.floor(Math.random() * 9000) + 1000);
        const trackingNo = `PCL-${oInfo.townCode}${dInfo.townCode}-${seq}`;
        const photoUrl = await uploadParcelPhoto(photo, trackingNo);
        const row = { tracking_no: trackingNo, sender_name: f.senderName.trim(), sender_nrc: f.senderNrc.trim().toUpperCase(), sender_phone: f.senderPhone.trim(), receiver_name: f.receiverName.trim(), receiver_phone: f.receiverPhone.trim(), origin_branch: originTown, origin_province: originProvince, origin_code: oInfo.townCode, dest_branch: destTown, dest_province: destProvince, dest_code: dInfo.townCode, description: f.description.trim(), photo_url: photoUrl, price: basePrice, status: "Booked", booked_by: user.name, service_type: serviceType, vehicle_plate: f.vehiclePlate.trim(), driver_name: f.driverName.trim(), home_delivery: homeDelivery, home_delivery_fee: hdFee };
        await saveParcelRow(row);
        setBusy(false);
        setDone(row);
        setF({ senderName: "", senderNrc: "", senderPhone: "", receiverName: "", receiverPhone: "", description: "", vehiclePlate: "", driverName: "" });
        setPhoto(null);
        setDestProvince("");
        setDestTown("");
        setHomeDelivery(false);
    }
    if (done)
        return (React.createElement(Card, { style: { textAlign: "center", padding: 32 } },
            React.createElement("div", { style: { fontSize: 40 } }, "\u2705"),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 17, color: C.green, marginTop: 8, marginBottom: 4 } },
                done.service_type,
                " Booked!"),
            React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: C.navy, letterSpacing: 1, marginBottom: 16 } }, done.tracking_no),
            React.createElement(IR, { label: "From", value: `${done.origin_branch}, ${done.origin_province}` }),
            React.createElement(IR, { label: "To", value: `${done.dest_branch}, ${done.dest_province}` }),
            React.createElement(IR, { label: "Receiver", value: `${done.receiver_name} · ${done.receiver_phone}` }),
            React.createElement(IR, { label: "Amount", value: fmt((done.price || 0) + (done.home_delivery_fee || 0)), bold: true }),
            React.createElement(Btn, { full: true, color: C.navy, style: { marginTop: 16 }, onClick: () => setDone(null) }, "\u2795 Book Another")));
    return (React.createElement(Card, null,
        React.createElement(ST, null,
            "\uD83D\uDCE6 Book New ",
            serviceType),
        React.createElement(Sel, { label: "Service Type", value: serviceType, onChange: e => setServiceType(e.target.value) },
            React.createElement("option", null, "Parcel"),
            React.createElement("option", null, "Shifting")),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px", borderLeft: `3px solid ${C.blue}`, paddingLeft: 8 } }, "Origin (sending from)"),
        React.createElement(ProvinceTownSelect, { required: true, province: originProvince, town: originTown, onProvince: setOriginProvince, onTown: setOriginTown }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px", borderLeft: `3px solid ${C.orange}`, paddingLeft: 8 } }, "Destination"),
        React.createElement(ProvinceTownSelect, { required: true, province: destProvince, town: destTown, onProvince: setDestProvince, onTown: setDestTown }),
        originTown && destTown && (priceLoading ? React.createElement(Alrt, { type: "info" }, "Looking up price for this route...")
            : routePrice ? React.createElement(Alrt, { type: "success" },
                "\uD83D\uDCB0 Route price: ",
                React.createElement("strong", null, fmt(basePrice)),
                routePrice.home_delivery_fee > 0 ? ` (+${fmt(routePrice.home_delivery_fee)} for home delivery)` : "")
                : React.createElement(Alrt, { type: "warn" }, "\u26A0\uFE0F No price set for this route yet \u2014 ask System Admin to set it in PTD \u2192 Prices.")),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, margin: "10px 0", padding: "10px 12px", background: C.light, borderRadius: 8 } },
            React.createElement("input", { type: "checkbox", checked: homeDelivery, onChange: e => setHomeDelivery(e.target.checked), style: { width: 18, height: 18 } }),
            React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: C.navy } },
                "Needs home delivery",
                routePrice?.home_delivery_fee > 0 ? ` (+${fmt(routePrice.home_delivery_fee)})` : "")),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.teal}`, paddingLeft: 8 } }, "Sender"),
        React.createElement(Inp, { label: "Sender Full Name", req: true, value: f.senderName, onChange: e => setF(x => ({ ...x, senderName: e.target.value })) }),
        React.createElement(Inp, { label: "Sender NRC", req: true, value: f.senderNrc, onChange: e => setF(x => ({ ...x, senderNrc: e.target.value.toUpperCase() })), placeholder: "123456/78/1" }),
        React.createElement(Inp, { label: "Sender Phone", value: f.senderPhone, onChange: e => setF(x => ({ ...x, senderPhone: e.target.value })) }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.purple}`, paddingLeft: 8 } }, "Receiver"),
        React.createElement(Inp, { label: "Receiver Full Name", req: true, value: f.receiverName, onChange: e => setF(x => ({ ...x, receiverName: e.target.value })) }),
        React.createElement(Inp, { label: "Receiver Phone", req: true, value: f.receiverPhone, onChange: e => setF(x => ({ ...x, receiverPhone: e.target.value })), placeholder: "For arrival SMS notification", note: "Used to notify them when the parcel arrives" }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.gold}`, paddingLeft: 8 } }, "Vehicle & Driver"),
        React.createElement(Inp, { label: "Vehicle Number Plate", value: f.vehiclePlate, onChange: e => setF(x => ({ ...x, vehiclePlate: e.target.value })), placeholder: "e.g. ABC 1234" }),
        React.createElement(Inp, { label: "Driver Name", value: f.driverName, onChange: e => setF(x => ({ ...x, driverName: e.target.value })) }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.red}`, paddingLeft: 8 } }, serviceType),
        React.createElement(PhotoUpload, { label: `${serviceType} Photo`, value: photo, onChange: setPhoto }),
        React.createElement(Inp, { label: "Description", value: f.description, onChange: e => setF(x => ({ ...x, description: e.target.value })), placeholder: "e.g. Documents, furniture, electronics" }),
        totalPrice > 0 && React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 14 } },
            React.createElement("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700 } }, "TOTAL AMOUNT"),
            React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: C.gold } }, fmt(totalPrice))),
        React.createElement(Btn, { full: true, color: C.navy, onClick: submit, disabled: busy }, busy ? "⏳ Booking..." : `📦 Book ${serviceType}`)));
}

function ParcelList({ user }) {
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [sf, setSf] = useState("");
    const [sel, setSel] = useState(null);
    const [collectNrc, setCollectNrc] = useState("");
    const [damageAmt, setDamageAmt] = useState("");
    const [damageNote, setDamageNote] = useState("");
    async function refresh() { setLoading(true); const p = await loadParcels(); setParcels(p); setLoading(false); }
    useEffect(() => { refresh(); }, []);
    async function reportDamage(p, whoSide) {
        if (!damageAmt && !damageNote) { alert("Enter a damage amount or a description."); return; }
        const patch = { damage_amount: parseFloat(damageAmt) || p.damage_amount || 0, damage_reported_at: new Date().toISOString() };
        if (whoSide === "sender") patch.damage_report_sender = damageNote;
        else patch.damage_report_receiver = damageNote;
        await saveParcelRow({ ...p, ...patch });
        setDamageAmt(""); setDamageNote("");
        refresh();
        alert("✅ Damage report saved.");
    }
    const filtered = parcels.filter(p => {
        const mQ = !q || p.tracking_no.toLowerCase().includes(q.toLowerCase()) || p.sender_name.toLowerCase().includes(q.toLowerCase()) || p.receiver_name.toLowerCase().includes(q.toLowerCase());
        const mS = !sf || p.status === sf;
        return mQ && mS;
    });
    async function advance(p, newStatus) {
        if (newStatus === "Collected" && collectNrc.trim().toUpperCase() !== p.sender_nrc && !window.confirm("NRC entered doesn't match sender's NRC on file. This should normally be the receiver's own ID — continue marking as Collected anyway?"))
            return;
        const patch = { status: newStatus };
        if (newStatus === "Arrived")
            patch.arrived_date = new Date().toISOString();
        if (newStatus === "Collected") {
            patch.collected_date = new Date().toISOString();
            patch.collected_by_nrc = collectNrc.trim().toUpperCase();
        }
        await saveParcelRow({ ...p, ...patch });
        setCollectNrc("");
        setSel(null);
        refresh();
    }
    if (sel) {
        const p = sel;
        const arrivalMsg = `Dear ${p.receiver_name}, your parcel ${p.tracking_no} from ${p.origin_branch} has ARRIVED at ${p.dest_branch}. Please collect it with your ID. — Palian Transport & Delivery (PTD)`;
        return (React.createElement("div", null,
            React.createElement(GBtn, { onClick: () => setSel(null), style: { marginBottom: 14 } }, "\u2190 All Parcels"),
            React.createElement(Card, null,
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 18, color: C.navy } }, p.tracking_no),
                    React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 } }, statusLabel(p.status))),
                p.photo_url && React.createElement("img", { src: p.photo_url, alt: "Parcel", style: { width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 12 } }),
                React.createElement(ST, null, "Route"),
                React.createElement(IR, { label: "From", value: `${p.origin_branch}, ${p.origin_province} (${p.origin_code})` }),
                React.createElement(IR, { label: "To", value: `${p.dest_branch}, ${p.dest_province} (${p.dest_code})` }),
                React.createElement(ST, null, "Sender"),
                React.createElement(IR, { label: "Name", value: p.sender_name }),
                React.createElement(IR, { label: "NRC", value: p.sender_nrc }),
                React.createElement(IR, { label: "Phone", value: p.sender_phone || "—" }),
                React.createElement(ST, null, "Receiver"),
                React.createElement(IR, { label: "Name", value: p.receiver_name }),
                React.createElement(IR, { label: "Phone", value: p.receiver_phone }),
                React.createElement(ST, null, "Details"),
                React.createElement(IR, { label: "Description", value: p.description || "—" }),
                React.createElement(IR, { label: "Service Type", value: p.service_type || "Parcel" }),
                React.createElement(IR, { label: "Price", value: fmt(p.price) }),
                p.home_delivery && React.createElement(IR, { label: "Home Delivery Fee", value: fmt(p.home_delivery_fee) }),
                (p.vehicle_plate || p.driver_name) && React.createElement(IR, { label: "Vehicle / Driver", value: `${p.vehicle_plate || "—"} · ${p.driver_name || "—"}` }),
                React.createElement(IR, { label: "Booked By", value: p.booked_by }),
                React.createElement(IR, { label: "Booked", value: p.booked_date ? new Date(p.booked_date).toLocaleString() : "—" }),
                p.arrived_date && React.createElement(IR, { label: "Arrived", value: new Date(p.arrived_date).toLocaleString() }),
                p.collected_date && React.createElement(IR, { label: "Collected", value: new Date(p.collected_date).toLocaleString() }),
                (p.damage_amount > 0 || p.damage_report_sender || p.damage_report_receiver) && React.createElement("div", { style: { background: "#FFF5F5", border: `1.5px solid ${C.red}`, borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 10 } },
                    React.createElement("div", { style: { fontWeight: 800, color: C.red, fontSize: 12, marginBottom: 6 } }, "⚠️ Damage Reported"),
                    p.damage_amount > 0 && React.createElement(IR, { label: "Damage Amount", value: fmt(p.damage_amount) }),
                    p.damage_report_sender && React.createElement(IR, { label: "Sender's Report", value: p.damage_report_sender }),
                    p.damage_report_receiver && React.createElement(IR, { label: "Receiver's Report", value: p.damage_report_receiver })),
                React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                    React.createElement(ST, { color: C.red }, "Report Damage"),
                    React.createElement(Inp, { label: "Damage Amount (K)", type: "number", value: damageAmt, onChange: e => setDamageAmt(e.target.value), placeholder: "0.00" }),
                    React.createElement(Inp, { label: "Description of Damage", value: damageNote, onChange: e => setDamageNote(e.target.value), placeholder: "What happened?" }),
                    React.createElement("div", { style: { display: "flex", gap: 8 } },
                        React.createElement(Btn, { sm: true, color: C.orange, onClick: () => reportDamage(p, "sender"), style: { flex: 1 } }, "Submit as Sender Office"),
                        React.createElement(Btn, { sm: true, color: C.purple, onClick: () => reportDamage(p, "receiver"), style: { flex: 1 } }, "Submit as Receiver Office"))),
                React.createElement("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 10 } },
                    p.status === "Booked" && React.createElement(Btn, { color: C.amber, onClick: () => advance(p, "In Transit") }, "\uD83D\uDE9A Mark In Transit"),
                    p.status === "In Transit" && React.createElement(Btn, { color: C.teal, onClick: () => advance(p, "Arrived") }, "\uD83D\uDCCD Mark Delivered"),
                    p.status === "Arrived" && React.createElement("a", { href: smsLink(p.receiver_phone, arrivalMsg), style: { textDecoration: "none" } },
                        React.createElement(Btn, { full: true, color: C.blue }, "\uD83D\uDCF1 Notify Receiver via SMS")),
                    p.status === "Arrived" && React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12 } },
                        React.createElement(Inp, { label: "Collector's NRC (verify before handing over)", value: collectNrc, onChange: e => setCollectNrc(e.target.value.toUpperCase()), placeholder: "123456/78/1" }),
                        React.createElement(Btn, { full: true, color: C.green, onClick: () => advance(p, "Collected") }, "\u2705 Mark Received")),
                    p.status === "Collected" && React.createElement(Alrt, { type: "success" },
                        "\u2705 Collected on ",
                        new Date(p.collected_date).toLocaleString())))));
    }
    return (React.createElement(Card, null,
        React.createElement(ST, null,
            "All Parcels (",
            filtered.length,
            ")"),
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" } },
            React.createElement("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "Search tracking #, sender, receiver...", style: { flex: 1, minWidth: 150, ...iSt } }),
            React.createElement("select", { value: sf, onChange: e => setSf(e.target.value), style: { ...iSt, maxWidth: 140 } },
                React.createElement("option", { value: "" }, "All Status"),
                React.createElement("option", null, "Booked"),
                React.createElement("option", null, "In Transit"),
                React.createElement("option", null, "Arrived"),
                React.createElement("option", null, "Collected"))),
        loading ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 24 } }, "Loading...")
            : filtered.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 28 } }, "No parcels found.")
                : filtered.map(p => (React.createElement("div", { key: p.tracking_no, onClick: () => setSel(p), style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 800, color: C.navy, fontSize: 13 } }, p.tracking_no),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            p.origin_branch,
                            " \u2192 ",
                            p.dest_branch),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            p.sender_name,
                            " \u2192 ",
                            p.receiver_name)),
                    React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, statusLabel(p.status)))))));
}
// ── TRANSPORT APP (separate module) ───────────────────────────────────────────
function TransportApp({ user, onLogout, onSwitch }) {
    const [tab, setTab] = useState("dash");
    return (React.createElement("div", { style: { fontFamily: "'Segoe UI',Arial,sans-serif", background: C.light, minHeight: "100vh" } },
        React.createElement("div", { style: { background: C.teal, color: "#fff", textAlign: "center", padding: "5px 8px", fontSize: 11, fontWeight: 700 } },
            "\uD83D\uDCE6 PTD \u2014 PALIAN TRANSPORT & DELIVERY \u2014 ",
            user.name),
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 200 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement(PalianLogo, { size: 34 }),
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 13, color: "#fff" } }, "PTD")),
                React.createElement("div", { style: { display: "flex", gap: 10 } },
                    React.createElement("button", { onClick: onSwitch, style: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" } }, "Switch"),
                    React.createElement("button", { onClick: onLogout, style: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" } }, "Logout")))),
        React.createElement("div", { style: { background: C.navy, display: "flex", borderBottom: `3px solid ${C.orange}`, overflowX: "auto" } }, [["dash", "🏠 Dashboard"], ["new", "➕ New"], ["all", "📦 All"], ...(isHO(user.role) ? [["prices", "🔑 Prices"]] : [])].map(([id, lb]) => (React.createElement("button", { key: id, onClick: () => setTab(id), style: { flex: 1, padding: "11px 8px", background: "none", border: "none", color: tab === id ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 12, cursor: "pointer", borderBottom: tab === id ? `3px solid ${C.orange}` : "3px solid transparent", marginBottom: -3, whiteSpace: "nowrap" } }, lb)))),
        React.createElement("div", { style: { padding: 14, maxWidth: 720, margin: "0 auto" } },
            tab === "dash" && React.createElement(PTDDashboard, { user: user }),
            tab === "new" && React.createElement(NewParcelForm, { user: user, onBooked: () => { } }),
            tab === "all" && React.createElement(ParcelList, { user: user }),
            tab === "prices" && isHO(user.role) && React.createElement(RoutePrices, { user: user }))));
}
function DailyReports({ db, setDb, user }) {
    const isHORole = isHO(user.role);
    const isMgr = user.role === "manager";
    const isConsultant = user.role === "consultant" || user.role === "officer";
    const [tab, setTab] = useState(isConsultant ? "mine" : "team");
    const [f, setF] = useState({ clientsSeen: "", loanAmount: "", notes: "" });
    const myReports = (db.dailyReports || []).filter(r => r.consultantId === user.id);
    const branchReports = (db.dailyReports || []).filter(r => r.branch === user.branch);
    const allReports = db.dailyReports || [];
    function submit() {
        const amt = parseFloat(f.loanAmount) || 0;
        if (!f.clientsSeen && !amt) {
            alert("Enter clients seen or loan amount.");
            return;
        }
        const row = { id: `DR-${Date.now()}`, consultantId: user.id, consultantName: user.name, branch: user.branch, province: user.province, reportDate: today(), clientsSeen: parseInt(f.clientsSeen) || 0, loanAmount: amt, notes: f.notes.trim(), status: "Pending", approvedBy: "", approvedDate: null };
        const nd = { ...db, dailyReports: [...(db.dailyReports || []), row] };
        saveDB(nd);
        setDb(nd);
        setF({ clientsSeen: "", loanAmount: "", notes: "" });
        alert("✅ Report submitted for approval.");
    }
    function approve(id, status) {
        const nd = { ...db, dailyReports: db.dailyReports.map(r => r.id === id ? { ...r, status, approvedBy: user.name, approvedDate: new Date().toISOString() } : r) };
        saveDB(nd);
        setDb(nd);
    }
    function targetRollup(consultantId) {
        const target = (db.consultantTargets || {})[consultantId] || 0;
        const monthPrefix = today().slice(0, 7);
        const achieved = (db.dailyReports || []).filter(r => r.consultantId === consultantId && r.status === "Approved" && (r.reportDate || "").startsWith(monthPrefix)).reduce((s, r) => s + r.loanAmount, 0);
        const pct = target > 0 ? Math.min(100, (achieved / target * 100)) : 0;
        return { target, achieved, pct };
    }
    function outstandingFor(consultantId) {
        const loans = db.loans.filter(l => l.consultantId === consultantId);
        const defaulted = loans.filter(l => getSt(l, db.payments) === "Defaulted").reduce((s, l) => s + getBal(l, db.payments), 0);
        const overdue = loans.filter(l => getSt(l, db.payments) === "Overdue").reduce((s, l) => s + getBal(l, db.payments), 0);
        return { defaulted, overdue };
    }
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" } },
            isConsultant && React.createElement("button", { onClick: () => setTab("mine"), style: { padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${tab === "mine" ? C.navy : C.border}`, background: tab === "mine" ? C.navy : "white", color: tab === "mine" ? "white" : "#333", fontWeight: 700, fontSize: 11, cursor: "pointer" } }, "\uD83D\uDCDD My Reports"),
            (isMgr || isHORole) && React.createElement("button", { onClick: () => setTab("approve"), style: { padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${tab === "approve" ? C.navy : C.border}`, background: tab === "approve" ? C.navy : "white", color: tab === "approve" ? "white" : "#333", fontWeight: 700, fontSize: 11, cursor: "pointer" } }, "\u2705 Approve"),
            (isMgr || isHORole) && React.createElement("button", { onClick: () => setTab("team"), style: { padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${tab === "team" ? C.navy : C.border}`, background: tab === "team" ? C.navy : "white", color: tab === "team" ? "white" : "#333", fontWeight: 700, fontSize: 11, cursor: "pointer" } }, "\uD83D\uDCCA Team Performance")),
        tab === "mine" && isConsultant && (React.createElement("div", null,
            React.createElement(Card, null,
                React.createElement(ST, null, "\uD83D\uDCDD Submit Today's Report"),
                React.createElement(Inp, { label: "Clients Seen Today", type: "number", value: f.clientsSeen, onChange: e => setF(x => ({ ...x, clientsSeen: e.target.value })), placeholder: "0" }),
                React.createElement(Inp, { label: "Loan Amount Given Today (K)", type: "number", value: f.loanAmount, onChange: e => setF(x => ({ ...x, loanAmount: e.target.value })), placeholder: "0.00" }),
                React.createElement(Inp, { label: "Notes", value: f.notes, onChange: e => setF(x => ({ ...x, notes: e.target.value })), placeholder: "Optional" }),
                React.createElement(Btn, { full: true, color: C.green, onClick: submit }, "\uD83D\uDCE4 Submit Report")),
            React.createElement(Card, null,
                React.createElement(ST, null, "My Reports"),
                myReports.length === 0 ? React.createElement("p", { style: { color: C.muted } }, "No reports yet.") : myReports.slice().reverse().map(r => (React.createElement("div", { key: r.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("strong", { style: { color: C.navy } }, r.reportDate),
                        React.createElement("span", { style: { background: r.status === "Approved" ? C.green : r.status === "Rejected" ? C.red : C.gold, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 } }, r.status)),
                    React.createElement(IR, { label: "Clients Seen", value: r.clientsSeen }),
                    React.createElement(IR, { label: "Loan Amount", value: fmt(r.loanAmount) }),
                    r.notes && React.createElement(IR, { label: "Notes", value: r.notes }))))))),
        tab === "approve" && (isMgr || isHORole) && (React.createElement(Card, null,
            React.createElement(ST, null, "\u2705 Pending Approvals"),
            (isHORole ? allReports : branchReports).filter(r => r.status === "Pending").length === 0 ? React.createElement(Alrt, { type: "info" }, "No pending reports.") :
                (isHORole ? allReports : branchReports).filter(r => r.status === "Pending").map(r => (React.createElement("div", { key: r.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                        React.createElement("strong", { style: { color: C.navy } }, r.consultantName),
                        React.createElement("span", { style: { fontSize: 11, color: C.muted } },
                            r.reportDate,
                            isHORole ? " · " + r.branch : "")),
                    React.createElement(IR, { label: "Clients Seen", value: r.clientsSeen }),
                    React.createElement(IR, { label: "Loan Amount", value: fmt(r.loanAmount) }),
                    r.notes && React.createElement(IR, { label: "Notes", value: r.notes }),
                    React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 10 } },
                        React.createElement(Btn, { sm: true, color: C.green, onClick: () => approve(r.id, "Approved"), style: { flex: 1 } }, "\u2705 Approve"),
                        React.createElement(Btn, { sm: true, color: C.red, onClick: () => approve(r.id, "Rejected"), style: { flex: 1 } }, "\u274C Reject"))))))),
        tab === "team" && (isMgr || isHORole) && (React.createElement(Card, null,
            React.createElement(ST, null,
                "\uD83D\uDCCA Team Performance \u2014 ",
                isHORole ? "All Provinces" : user.branch),
            db.staff.filter(s => s.role === "consultant" && s.active && (isHORole || s.branch === user.branch)).map(s => {
                const { target, achieved, pct } = targetRollup(s.id);
                const { defaulted, overdue } = outstandingFor(s.id);
                return (React.createElement("div", { key: s.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.navy, marginBottom: 6 } },
                        s.name,
                        isHORole ? " · " + s.branch : ""),
                    React.createElement("div", { style: { background: C.light, borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 6 } },
                        React.createElement("div", { style: { background: pct >= 100 ? C.green : pct >= 50 ? C.amber : C.red, height: "100%", width: pct + "%" } })),
                    React.createElement(IR, { label: "Target (this month)", value: fmt(target) }),
                    React.createElement(IR, { label: "Achieved (Approved)", value: `${fmt(achieved)} (${pct.toFixed(0)}%)` }),
                    defaulted > 0 && React.createElement(IR, { label: "Defaulted (uncollected)", value: fmt(defaulted), color: C.red }),
                    overdue > 0 && React.createElement(IR, { label: "Overdue (uncollected)", value: fmt(overdue), color: C.orange })));
            })))));
}

function DeletionRequests({ db, setDb }) {
    const pending = (db.clients || []).filter(c => c.deletionRequested);
    function approve(c) {
        if (!window.confirm(`Permanently delete ${c.name}'s record? This cannot be undone.`))
            return;
        const nd = { ...db, clients: db.clients.filter(x => x.id !== c.id) };
        saveDB(nd);
        setDb(nd);
        sb.from("clients").delete().eq("id", c.id).then(() => { }).catch(e => console.error(e));
    }
    function reject(c) {
        const nd = { ...db, clients: db.clients.map(x => x.id === c.id ? { ...x, deletionRequested: false, deletionRequestedBy: "", deletionRequestedDate: null, deletionReason: "" } : x) };
        saveDB(nd);
        setDb(nd);
    }
    return (React.createElement(Card, null,
        React.createElement(ST, { color: C.red },
            "\uD83D\uDDD1\uFE0F Client Deletion Requests (",
            pending.length,
            ")"),
        pending.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 32 } },
            React.createElement("div", { style: { fontSize: 40 } }, "\u2705"),
            React.createElement("p", null, "No pending deletion requests."))
            : pending.map(c => (React.createElement("div", { key: c.id, style: { border: `1.5px solid ${C.red}`, borderRadius: 10, padding: 14, marginBottom: 12, background: "#FFF5F5" } },
                React.createElement("div", { style: { fontWeight: 800, color: C.navy, fontSize: 14, marginBottom: 6 } }, c.name),
                React.createElement(IR, { label: "NRC", value: c.nrc }),
                React.createElement(IR, { label: "Branch", value: `${c.branch}, ${c.province}` }),
                React.createElement(IR, { label: "Requested By", value: c.deletionRequestedBy }),
                React.createElement(IR, { label: "Requested On", value: c.deletionRequestedDate ? new Date(c.deletionRequestedDate).toLocaleString() : "—" }),
                c.deletionReason && React.createElement(IR, { label: "Reason", value: c.deletionReason }),
                React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 12 } },
                    React.createElement(Btn, { color: C.red, sm: true, onClick: () => approve(c), style: { flex: 1 } }, "\uD83D\uDDD1\uFE0F Approve & Delete"),
                    React.createElement(Btn, { color: C.green, sm: true, onClick: () => reject(c), style: { flex: 1 } }, "\u274C Reject Request")))))));
}

function PTDDashboard({ user }) {
    const isHORole = isHO(user.role);
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { loadParcels().then(p => { setParcels(p); setLoading(false); }); }, []);
    const mine = isHORole ? parcels : parcels.filter(p => p.origin_branch === user.branch || p.dest_branch === user.branch);
    const pendingIncoming = mine.filter(p => ["Sent", "In Transit"].includes(p.status) && (isHORole ? true : p.dest_branch === user.branch));
    const pendingOutgoing = mine.filter(p => ["Sent", "In Transit"].includes(p.status) && (isHORole ? true : p.origin_branch === user.branch));
    const totalDelivery = mine.reduce((s, p) => s + (p.price || 0) + (p.home_delivery_fee || 0), 0);
    const totalDamage = mine.reduce((s, p) => s + (p.damage_amount || 0), 0);
    const totalParcels = mine.length;
    const collected = mine.filter(p => p.status === "Collected").length;
    if (loading)
        return React.createElement(Card, { style: { textAlign: "center", padding: 32, color: C.muted } }, "Loading...");
    return (React.createElement("div", null,
        React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, color: "#fff", padding: 18, marginBottom: 14 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, marginBottom: 10 } }, isHORole ? "📦 PTD — All Towns" : `📦 PTD — ${user.branch}`),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                React.createElement("div", { style: { background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, textAlign: "center" } },
                    React.createElement("div", { style: { fontSize: 9, opacity: 0.75 } }, "DELIVERY AMOUNT"),
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: C.gold } }, fmt(totalDelivery))),
                React.createElement("div", { style: { background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, textAlign: "center" } },
                    React.createElement("div", { style: { fontSize: 9, opacity: 0.75 } }, "DAMAGE AMOUNT"),
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 900, color: totalDamage > 0 ? "#ff6b6b" : "#A5D6A7" } }, fmt(totalDamage))))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 } },
            React.createElement(StatCard, { label: "Total Parcels", value: totalParcels, color: C.navy, icon: "\uD83D\uDCE6" }),
            React.createElement(StatCard, { label: "Received", value: collected, color: C.green, icon: "\u2705" }),
            React.createElement(StatCard, { label: "Pending", value: pendingIncoming.length + pendingOutgoing.length, color: C.orange, icon: "\u23F3" })),
        pendingIncoming.length > 0 && React.createElement(Card, { style: { borderLeft: `4px solid ${C.teal}` } },
            React.createElement(ST, { color: C.teal },
                "\uD83D\uDCE5 Pending Parcel \u2014 Arriving ",
                isHORole ? "(all towns)" : `at ${user.branch}`,
                " (",
                pendingIncoming.length,
                ")"),
            pendingIncoming.map(p => (React.createElement("div", { key: p.tracking_no, style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy } }, p.tracking_no),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                        p.origin_branch,
                        " \u2192 ",
                        p.dest_branch)),
                React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 } }, statusLabel(p.status)))))),
        pendingOutgoing.length > 0 && React.createElement(Card, { style: { borderLeft: `4px solid ${C.amber}` } },
            React.createElement(ST, { color: C.amber },
                "\uD83D\uDCE4 Pending Delivery \u2014 Sent from ",
                isHORole ? "(all towns)" : user.branch,
                " (",
                pendingOutgoing.length,
                ")"),
            pendingOutgoing.map(p => (React.createElement("div", { key: p.tracking_no, style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy } }, p.tracking_no),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                        p.origin_branch,
                        " \u2192 ",
                        p.dest_branch)),
                React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 } }, statusLabel(p.status)))))),
        pendingIncoming.length === 0 && pendingOutgoing.length === 0 && React.createElement(Alrt, { type: "success" }, "\u2705 No pending parcels right now.")));
}
function RoutePrices({ user }) {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [originProvince, setOriginProvince] = useState("");
    const [originTown, setOriginTown] = useState("");
    const [destProvince, setDestProvince] = useState("");
    const [destTown, setDestTown] = useState("");
    const [serviceType, setServiceType] = useState("Parcel");
    const [price, setPrice] = useState("");
    const [hdFee, setHdFee] = useState("");
    function refresh() { setLoading(true); loadRoutePrices().then(p => { setPrices(p); setLoading(false); }); }
    useEffect(() => { refresh(); }, []);
    async function save() {
        if (!originTown || !destTown || !price) {
            alert("Select origin, destination, and enter a price.");
            return;
        }
        await saveRoutePrice({ origin_town: originTown, dest_town: destTown, service_type: serviceType, price: parseFloat(price) || 0, home_delivery_fee: parseFloat(hdFee) || 0, updated_by: user.name, updated_at: new Date().toISOString() });
        setPrice("");
        setHdFee("");
        refresh();
        alert("✅ Price saved — applies to all towns immediately.");
    }
    return (React.createElement("div", null,
        React.createElement(Card, null,
            React.createElement(ST, { color: C.purple }, "\uD83D\uDD11 Set Route Price (Admin/HO only)"),
            React.createElement(Alrt, { type: "info" }, "Prices set here apply everywhere \u2014 branch staff cannot edit them, only select a route and the price fills in automatically."),
            React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px" } }, "Origin"),
            React.createElement(ProvinceTownSelect, { required: true, province: originProvince, town: originTown, onProvince: setOriginProvince, onTown: setOriginTown }),
            React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px" } }, "Destination"),
            React.createElement(ProvinceTownSelect, { required: true, province: destProvince, town: destTown, onProvince: setDestProvince, onTown: setDestTown }),
            React.createElement(Sel, { label: "Service Type", value: serviceType, onChange: e => setServiceType(e.target.value) },
                React.createElement("option", null, "Parcel"),
                React.createElement("option", null, "Shifting")),
            React.createElement(Inp, { label: "Price (K)", type: "number", value: price, onChange: e => setPrice(e.target.value), placeholder: "0.00" }),
            React.createElement(Inp, { label: "Home Delivery Add-on Fee (K)", type: "number", value: hdFee, onChange: e => setHdFee(e.target.value), placeholder: "0.00" }),
            React.createElement(Btn, { full: true, color: C.purple, onClick: save }, "\uD83D\uDCBE Save Route Price")),
        React.createElement(Card, null,
            React.createElement(ST, null,
                "All Route Prices (",
                prices.length,
                ")"),
            loading ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 20 } }, "Loading...")
                : prices.length === 0 ? React.createElement("div", { style: { textAlign: "center", color: C.muted, padding: 20 } }, "No routes priced yet.")
                    : prices.map(p => (React.createElement("div", { key: p.id, style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy } },
                                p.origin_town,
                                " \u2192 ",
                                p.dest_town),
                            React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                                p.service_type,
                                p.home_delivery_fee > 0 ? ` · Home delivery +${fmt(p.home_delivery_fee)}` : "")),
                        React.createElement("div", { style: { fontWeight: 800, color: C.green } }, fmt(p.price))))))));
}

function App() {
    const [db, setDb] = useState(() => MDB || defDB());
    const [dbLoaded, setDbLoaded] = useState(false);
    const [user, setUser] = useState(null);
    const [sessionLogId, setSessionLogId] = useState(null);
    const [module, setModule] = useState(null); // 'loans' | 'transport'
    const [tab, setTab] = useState("dashboard");
    const [prefNrc, setPrefNrc] = useState("");
    const [finReport, setFinReport] = useState(null); // {loan, client}
    useEffect(() => {
        (async () => {
            try {
                const p = await loadDB();
                MDB = p;
                setDb(p);
            }
            catch (e) {
                console.error("loadDB error", e);
            }
            setDbLoaded(true);
        })();
    }, []);
    async function handleLogin(u) {
        const now = new Date();
        const log = { name: u.name, role: u.role, roleLabel: u.roleLabel, branch: u.branch, province: u.province, date: now.toLocaleDateString("en"), time: now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
        setDb(d => ({ ...d, loginLogs: [...(d.loginLogs || []), log] }));
        const logId = await logLoginToDB(u);
        setSessionLogId(logId);
        setUser(u);
        setModule(null);
        setTab("dashboard");
    }
    function handleLogout() {
        logLogoutToDB(sessionLogId);
        setUser(null);
        setModule(null);
        setSessionLogId(null);
    }
    function onReport(loan, client) { setFinReport({ loan, client }); }
    if (!dbLoaded)
        return (React.createElement("div", { style: { minHeight: "100vh", background: `linear-gradient(160deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#fff" } },
            React.createElement(PalianLogo, { size: 60 }),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 18 } }, "PALIAN MONEY LENDING"),
            React.createElement("div", { style: { fontSize: 13, opacity: 0.7 } }, "Loading saved data...")));
    if (!user)
        return React.createElement(Login, { db: db, onLogin: handleLogin });
    if (!module)
        return React.createElement(SystemSelect, { user: user, onSelect: setModule, onLogout: handleLogout });
    if (module === "transport")
        return React.createElement(TransportApp, { db: db, setDb: setDb, user: user, onLogout: handleLogout, onSwitch: () => setModule(null) });
    const hoRole = isHO(user.role);
    const info = hoRole ? null : gBI(user.branch);
    const pendN = db.loans.filter(l => l.approvalStatus === "Pending" && (hoRole || l.branch === user.branch)).length;
    const ovN = (hoRole ? db.loans : bL(db, user.branch)).filter(l => ["Overdue", "Defaulted"].includes(getSt(l, db.payments))).length;
    const delN = (db.clients || []).filter(c => c.deletionRequested).length;
    const coreTabs = [{ id: "dashboard", lb: "🏠 Home" }, { id: "newloan", lb: "➕ Loan" }, { id: "approvals", lb: "✅ Approve", badge: pendN }, { id: "payments", lb: "💳 Pay" }, { id: "clients", lb: "👥 Clients" }, { id: "loans", lb: "📋 Loans" }, { id: "daily", lb: "🗒️ Daily" }, { id: "notify", lb: "🔔 Alerts", badge: ovN }, { id: "reports", lb: "📄 Reports" }, { id: "backup", lb: "💾 Backup" }, { id: "ai", lb: "🤖 AI" }, { id: "export", lb: "⬇️ Export" }, { id: "leave", lb: "🏖️ Leave" }, { id: "install", lb: "📱 Install" }];
    const extraTabs = { accounts: [{ id: "funds", lb: "💰 Funds" }, { id: "hr", lb: "🧾 Payroll" }], admin: [{ id: "funds", lb: "💰 Funds" }, { id: "hr", lb: "👥 HR" }, { id: "mgr-funds", lb: "🔑 Branch Funds" }, { id: "deletions", lb: "🗑️ Deletions", badge: delN }], hr: [{ id: "hr", lb: "👥 HR System" }], manager: [{ id: "mgr-funds", lb: "💼 Fund Mgmt" }] };
    const allTabs = [...coreTabs, ...(extraTabs[user.role] || [])];
    function newLoan(nrc) { setPrefNrc(nrc || ""); setTab("newloan"); }
    return (React.createElement("div", { style: { fontFamily: "'Segoe UI',Arial,sans-serif", background: C.light, minHeight: "100vh" } },
        React.createElement("style", null, `@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`),
        finReport && React.createElement(FinancialReportView, { loan: finReport.loan, client: finReport.client, db: db, onClose: () => setFinReport(null) }),
        React.createElement("div", { style: { background: hoRole ? C.purple : C.teal, color: "#fff", textAlign: "center", padding: "5px 8px", fontSize: 11, fontWeight: 700 } },
            hoRole ? "🌍 HEAD OFFICE — All 10 Provinces" : `📍 ${user.branch}, ${info.province} · ${info.provinceCode}-${info.townCode}`,
            " \u00A0\u00B7\u00A0 \uD83D\uDCBE Data auto-saved"),
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(15,45,92,0.3)" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement(PalianLogo, { size: 34 }),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 900, fontSize: 13, color: "#fff", letterSpacing: 0.5 } }, "PALIAN MONEY LENDING"),
                        React.createElement("div", { style: { fontSize: 9, color: "rgba(255,255,255,0.6)" } }, hoRole ? "Head Office" : `📍 ${user.branch}`))),
                React.createElement("div", { style: { textAlign: "right" } },
                    React.createElement("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700 } }, user.name),
                    React.createElement("div", { style: { fontSize: 9, color: "rgba(255,255,255,0.6)" } }, user.roleLabel || user.role),
                    React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
                        React.createElement("button", { onClick: () => setModule(null), style: { background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer", padding: 0 } }, "Switch"),
                        React.createElement("button", { onClick: handleLogout, style: { background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer", padding: 0 } }, "Logout"))))),
        React.createElement("div", { style: { background: C.navy, display: "flex", overflowX: "auto", borderBottom: `3px solid ${C.orange}` } }, allTabs.map(t => (React.createElement("button", { key: t.id, onClick: () => setTab(t.id), style: { padding: "9px 10px", background: "none", border: "none", color: tab === t.id ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 10, cursor: "pointer", borderBottom: tab === t.id ? `3px solid ${C.orange}` : "3px solid transparent", marginBottom: -3, whiteSpace: "nowrap", position: "relative", flexShrink: 0 } },
            t.lb,
            t.badge > 0 && React.createElement("span", { style: { background: C.red, color: "#fff", borderRadius: 10, fontSize: 8, padding: "1px 4px", marginLeft: 2, fontWeight: 800 } }, t.badge))))),
        React.createElement("div", { style: { padding: 14, maxWidth: 720, margin: "0 auto" } },
            tab === "dashboard" && (hoRole ? React.createElement(HODashboard, { db: db, user: user, onReport: onReport }) : React.createElement(BranchDashboard, { db: db, user: user, onNewLoan: () => newLoan(""), onReport: onReport })),
            tab === "newloan" && React.createElement(Wizard, { key: "w" + prefNrc, db: db, setDb: setDb, user: user, onDone: () => setTab("dashboard") }),
            tab === "approvals" && React.createElement(Approvals, { db: db, setDb: setDb, user: user }),
            tab === "payments" && React.createElement(Payments, { db: db, setDb: setDb, user: user, onReport: onReport }),
            tab === "clients" && React.createElement(Clients, { db: db, setDb: setDb, onNewLoan: newLoan, user: user, onReport: onReport }),
            tab === "loans" && React.createElement(AllLoans, { db: db, user: user, onReport: onReport }),
            tab === "notify" && React.createElement(Notifications, { db: db, user: user, onReport: onReport }),
            tab === "daily" && React.createElement(DailyReports, { db: db, setDb: setDb, user: user }),
            tab === "reports" && React.createElement(Reports, { db: db, user: user, onReport: onReport }),
            tab === "backup" && React.createElement(BackupRestore, { db: db, setDb: setDb }),
            tab === "ai" && React.createElement(AIAdviser, { db: db, user: user }),
            tab === "export" && React.createElement(Export, { db: db, user: user }),
            tab === "leave" && React.createElement(LeaveRequest, { db: db, setDb: setDb, user: user }),
            tab === "install" && React.createElement(Install, null),
            tab === "funds" && React.createElement(AccountsFunds, { db: db, setDb: setDb, user: user }),
            tab === "hr" && React.createElement(HRSystem, { db: db, setDb: setDb, user: user }),
            tab === "deletions" && React.createElement(DeletionRequests, { db: db, setDb: setDb }),
            tab === "mgr-funds" && React.createElement(ManagerFunds, { db: db, setDb: setDb, user: user }))));
}
// ── MOUNT ──────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));
