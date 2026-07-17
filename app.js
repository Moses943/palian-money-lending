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
  "nYKIkuz5SV0FFwZC0lslvbcb+bWfE+vYeqXJX5W0+jA4tgZ0szNOx/8ATafiR3PkPUri1RqTE8PtK381k5mUcTjYHTSv26Na0dgP",
  "MnoAPMlEnN4iS5RpxcpGYyKhgacsskkdaFvvyzzvA3/mc4/1K16LjDomaz4EeqMbNLvttHOHD8R0XzN4v+0Xqnj9rmNj5LFbAmfw",
  "8fg67iW7E7NLwPvyH/XYL19wE9lZ+NxdXK6z5o7D2h7MTG7bkH/VcPP+UdviuluNkQsKMal3PEn+lHN2e1/6jVlG2hmKfNnpyjka",
  "uThE1SzFaiP78Lw4fksla3azOmdBVWQS2qGHiA92Hma0n/COpWHV4t6SuSBkWbgLj/EHNH4kLjK20LOhPgq1oxfZySf1Osp2txUh",
  "xxptruk8G4IselkK+QhE1axFYiPZ8Tg4fksgHdeyMozSlF5TPM008MIiK5AI3WFfxUV4tk3dFYZ9yeM7Pb9fMeh6LNRQ1klNrkRd",
  "TIywWG1Lwayd393K3oyb5fB3p+ClN91j3qUV+u6GZvM09iOhafIg+RHxWHjbcsMxoW3bzsHNHLt/fM+PzHmPr5qOWhZrKyiUVW91",
  "RVb3UsqXIiKpYIiIAiIgCIiAIiICh7KOy9ySvA2OAB1md3hxA9gfMn0A3P0Ui7oFEVB9uy9iyesdf9ni+fQvP47D6ISueWZePox4",
  "+oyFhJDepe49XHuSfUleJ/8AaO8U5IK+C0BSmLROP0lkGtPdoJELD9Q523oF7i23Xy64l4u17RPtlZHCQPc+vPlRj/Eb18KrAOWR",
  "w+jHn5ldPsCjCV061Ty005f79Tkt469SNqqFPzVWo/f7Hc3sEezrDDRj4l6gqiSxKS3CwSt3EbOxsbHzJ3DfgNz5hd18bOOztPTS",
  "4HT0jXZFvu2Lg6iD+Vvxd6+XzWzcU9XVOEfD6vRxLGV7BibSx8DO0bWt25tvg0AfXZeaNE8Ps5xIyr46EZe3m3sXZyfDj37lx8z6",
  "Dqvk2+m8t3d3f5Oyy6s+3OMeiXZ9W+nPqfVdzN2rSztPzd7hUod+UpdW+6XJLry6EGLk9+7JYtTyWJ5Du+WVxc4n1JW4adwGTy3J",
  "9ix9m0PjFE5w/HbZegtD8AdN6TZHLahGYyA6ma0N2A/ys7D67lbjnNWad0XWDsrl8dhoGjoLNhkI29ASFwtHcKrcx8S/rcGei1fu",
  "3p9Tr7ze2nOXg7PouXbp+yWv0OmNNaN1jiJWT1KVuo8fB4bv8xv1Xb+mMvmZWtgzGMfBL2+0M2LHfMb9Fptv2quE9KQsk1vji4dP",
  "1XO8fiGkLMxPtJ8MM3K2KrrfEeI7oGzTeFv/AJ9l1Ox927fYlVStL2eOsG4uL9safNYZy20Ke1L2PiV7KS9eCa/k7MCLFx2Up5au",
  "2elagtwO7S15A9p+oKyt19FTycc04vDCIikgLBy1B1yBronBlmI+JC8+Th5H0PY+hWciglPDyYuMvNyFNkwaWE9HMPdjh0LT8jus",
  "tvdREW9DNyM7Q3G+I34CRoAd+I2P0Kl29VGdCWsPQuREUEhERAEREAREQBERAcF2dtWnNM77sbC8/QbrEwdY1sXXDxtI5vPJuOpc",
  "7q7f6kpqI/7msN/j5Yz8nODT/VZzRsAEXMl+U4MjaFHH2rJ7QxPkP0BP+i8Jf7PPSv8AaXiDrfXlppe6EmtC93/MneZJD8+VoH+J",
  "e0OJdk0uHWqbAOxixVp4PyhcV5y9kShLoD2SxlYIiclmbE80DWj3pJHuEMX/AIhbincxs9l3VV9eFe2rf0NBWtnebVtaS6cT99Ev",
  "5ZK6lxd3jtxdtU6sjo8Hiv1D7I6tY0H3iP5nO32+Xou1NXa90R7OujYDkLEWOqMaW16cQ5rFl3nyt7uJ83Hp8So2lSucJdFVcHpv",
  "FHP6uuNMhYXckXin70s8h+7G09PidtgO66mh9nbSWoNVWM1xd4h1NR6mLtpccy+ytWrefhBpdz8o+Hu/JfOtn2FS247lxzcVdZN8",
  "o55R9uWn2PrvjWF04Qvqzha0tIxiszm1zeOSy/1S+Sy8nSvFf239a67sS0tNE6VxTiWtFU89uQfzSfu/JoHzK6Pfp3VeqbL7b8Xm",
  "svO87undXmmcfXmIK+puA0pwy4filUxdLTmHktNBrAeC2ScHoC1zjzP3PTfcraMrqzA6cljr5PM4/GSvbzMitWWQuc3fbcBxHRey",
  "eyqtw816ufbQ661/ELZ+xoeFsjZyhHu5fE/m0m3+7PkRY4f6oqML59NZeFvxfQlA/wDFQlmrNTdy2YJIHfwzMLT+a+ymW1bg8EIT",
  "k8zQxwnbzRfarTI/EHxbzEbjqOoUdnJtHZF9apmJcHZfeaHQQXTC4ztd0BYHfeB8tu6wS2Ev01P4NrR/Fyqn/es016T+8WfJPSuu",
  "NQaIutt4DNXcRO0781SdzAfm3sfqF6m4Re39k8fNDQ1/RGRqnZv6VoMDZmer4+zv8Ox9Cu8eIHsw8F89cjpXKdDTeXtf3LcfbbVl",
  "eSdhyxk7O6/yrznxC9hyzQylmponVmNz92IF5wtydkN1o237A7Hpt3DVgVpf2L4qLyuy+zNrU3k3O3rj4W0qfhTfKUlhr5Tjn/lh",
  "d0e7dIa1wuvMJBl8Dkq+Tx8w92aB2+x+Dh3aR8D1U4vlDovV+v8A2atdN2rXMLaLwLWMvMcIbTAeoI7H0c3t5FfSDhBxgw/F/Tce",
  "RxzvAtsAFqjIQZIHf6tPkfNbuz2jC5fhzXDPt9j5PvPujW2C1c28/Ft5eWa6ejxp8mtH6cjfkRFtz56ReeHhVobW+xrStk39N+V3",
  "/tJUoxYeYhFjFXIyN+aF42+hXPQk8WnA/wDija78QqdS/OKMhERAEREAREQBERAEREBGai6Yp5+EkR/+Rqzx2WJnYnTYe41g3f4Z",
  "c0eo6j8wuerO2zWimYd2SNDx8iN0XMl+VGr8XRvwp1mB3/Qtz/6HrW+CejxjuEPDejI0eFj8XXsOYR3mMYIP0L3H57Kb4i6kxX2S",
  "1pW3JIy9maMsMI8Fzo/1n6pvM8Dlbu97Wjc9yPiFAUuOeiNMUaWImyT2WK0EMEcIrv3laAWBzOmxbvG4c2+3T1CzykpUPBf+Wf2P",
  "GoONx4y/xx+7O0wxoJOw3PmvKnGfAxOy2arY7EOt2rGr2iKGkC2XxpMMXCUBnvP5ZCJS3seUk9Nyu65ePWjIWZBz8hM1tEftBdUl",
  "byPABMfVo98A7lvcAE9gdusodb8Kp9V4/JR5jUL7l/JszFSn+t8Oa0+NzWua3bm2MbXNDd9thy7bdFiPQdUWsu2hxidj8nicdj9P",
  "3Hy4u9TkdCTRgn5ebZ3Nyxlkjmy7t3a17JmtO5JPYOtbLc7hJ5MnXglz1bS2Rw+VkLAXPlr2q8e5J67OEjnt9Jj8VtOlbXC7AVNQ",
  "tpWsvlKtyCHH3a9ps07HxzGWRjAC3qSZZiXH3veO5UFqLE8KdP2bOQyec1LvmcbBFYmmkkkbPVexzomP5mHclkR37uIjHNvyjYSS",
  "XG7K6ct6mkxmMmoyZfE6YzMNmCFrTJWj+zxviaenQAjcAdj8FoGttUYqTjLh8K2ljodMR4qLTN2VzYmmKMt6PYS4cnhyvbyu26GG",
  "QDqSp2vjeDOOdi8tUzOfimy1M4yqIA/mmrzlj+Tk8PbllMzDzbbu5h12HSV0nqHgzojTmRgqZLK5HGXscKlqtbE1jlqskc3dw5fN",
  "9hw5+pLnnrugNe15qaa1mNHy3sHXzeTs0bOB1HC1n7Q9taT9a+E9xI3Z0sfn7/TYuUxwXo27HtB5OzlasdgtxBs0ssyMeFkg4Vmf",
  "bYyP3pI+QP8Ag4OHbvyWIeD+ndZ18zkNR55ub2it/tk8xc51d5a1jhyb84LeVw7uAAcSNls+DyfDfA2Kur8fkMuIa75oK1BpldFW",
  "8drpXhsO3SNwjc4DcsBYeXYjYAdo6z0Bp/iDinY7UOKrZSqfuiZm7mH4sd3afUFeernAPPcDtQt1NoOzNkcdCSZaEh3mEfmw7f3j",
  "fzHqu58zxx0rgsjXo2pronnDDH4dKVwdzxGZo6N7+G1zj8NiO42TUnHHSWlrTILt2ZxewvbJXrvlj2EPjn3gNtxF75Hk0g+a8NxZ",
  "0rnEnpJcmuaN5YbZu9nxlRhLipS80HrF+3R+q1Ng0Vq+nrXT9fKUyWiQcskLvvRPH3mu9Qp9dE4/jjw7pZ2pksRkJ4v008RGtHUf",
  "yXH78ocwAdHh3Q/HfY9VsFP2nuH1+VzIcpO7kfEx7vskhDXSBxjHQdeYMcRtv90r00uPhxU5o1VfwnNuj5X0fNen/fU7PuuDKc7j",
  "2DHE/grcQ0sxlNp7iFgP+ULAyeShv6ZktU5o7EFqEeDLGeZrw8bNIPnvuFLwM8ONrPJrQFkfMx/pORERQQEREAREQBERAEREBbIA",
  "5hBG4PkorAPMVaSm779WQxde/L3af8pClj2UPeIxuUiudoZgIJvQ7+478SR9QnqStcxOq+OHDfVOvtZaafhAyLFV69mG/LJa8IPb",
  "I3o3oC4Frmxva5oOzmtPl1694f8ABPXuipYLk2Iq5G3VowUyJ7UUgncx9vnGxcN4nR2i08xa4ENPKdiD6sB3RXMZ45Z7Mmt8hlNS",
  "z5iISVMrj4K769K+0DmZFHG0s5v+K3k6udsC3nbuQ/cSGI4Ga6bkqFu1p6s19bEyVS2a3C8MnLOZj4nBxLHtkZHtJt26EDZetkUA",
  "6Mx/DLLYfhlax1DTsVbJXM46/PWiniBMZfuHb83LuAGjl5unx8l19q7hTxS1vRkgyGApxiGOnBUZFYgLWxwwTscJeaQ8+75gew3G",
  "46dCpX2ptE6pdlcFc0dJqG9ksheeZ215pH1qjGw8odyt6NG5B69yPVdXcI+HuvMnrTQ0epquoa2PkLrFkXGWTG1kQDIopC1w5HOL",
  "ZH7uO3Vu4O61s7uUKvhKDfr0O1tt3qNxY/nndRjo3w4+LRPpnrwvBtWB9nHXOLxWkbN3Gi5lsVbZIY4L0TWRw+M18kYa52xaOXeI",
  "Anl5ng7AjbJy3AfiBfrif9C1/tAxslFsMdyIe8ZKRDn7u25eSn5Enmc7cAFaRqZnE7K6l1lm24fVVWSexJXbNB44EdZ9gRiOOMDZ",
  "wbFGXczexk3W/cFuFOoJNcaO/tHVzVericRLkrH2mzMIjZlsudBXPvbOMbOpb177FI3kpy4VB/6/kWr7uUra3depdRylyWG88Oce",
  "bvhe/I4sV7Nmrsfn9LZias+3fxuMdVsTSX43Fx5YjG5oO+87Hxgbn3XtawFwO5WxV+EOsK+MzZ/Q7n2cjf8AtkrXXoyXOP2slzWu",
  "kc1jQZ2DlDviRud9+otZaH4ivxjp6tXU1qTOZfItiqs8Zogrtkf9ma8A+4HvkMhJ2HLG0dgtp4O8L9Yau4oX4NW/2jqYTHMljkln",
  "nmhbO9rY4YQx2/vbtY95I/i79VCvZSmoKm9S9TdqhSt5XMryOIpvCWummMZ6vT/0l9Z8L+L+tLLLbsXUxd+vcrPpT1rcQEEUUBaO",
  "beQlzvEc4HoN2+W/RcUns9a4xmRyEceMjyVKa9asRCPIMfHHDLSMLY2+KWO2a8gcpGwaOhOwC9W4TD18BiamOq+Ia9aMRMMry95A",
  "8y49SfUrOWzWcHDvCbxyPOsnCzUTchPIzSFP7PDPWlqxssV9ofCsskHggkbHkDh15du3XdaJpPgFxCwDshG7A1nstvh2e6zAHhvJ",
  "M2TneH7uI8RvIeXoAQd9hv7FVr3tjYXOIa0dST2CEGo6dwcuFw2BwU8jJZ4ea1ZMW/JvzF5Dd/3ed4A9GrcWDZRGGBtyT5B4I+0b",
  "CIHyiH3fx3LvqFLtVVyyWl0XYuREQBERAEREAREQBERAUPZcFqtHcryQytD43tLXNPmFznsrVKIZF4q1JBI7H2nF1iIbskP/ABme",
  "TvmOx9fmpRYeSx4vRt5XmGeM80Uze7Hf/nxHmuLH5J0kpq2miG40blv7rx/E0+Y/MItCz+LVEiiIrGMpy902CqigFNgmwVUUgpyh",
  "NgqogCInZAFD33HL2jQjP7OzY2nj4dxGPU+fp81fcyEtqd1Og4eKOks+27YR/q74D8Vm0aMVCs2GIHlHUucdy4+ZJ8yVV6l18OvU",
  "52sDAABsB5BXN7qiq3upZUuREVSwREQBERAEREAREQFD2VquPZWqyKsLFvY6HIRBkoO7TzNe07OYfiD5FZSIFpqiIFy3ivduNdYr",
  "jtaib1A/naP6jp6BSVezFahbLDI2WN3ZzTuCuUjdR1jCQSSmaAvqTnvJAeXf5jsfqFGqLZT56Eiii/8AetXf+4usHbvE/wD1B/JV",
  "/TD4h+0ULcXxLWCQD/KSfyTI4X0JNFHDPVCNz4zP++vI3+rUdnqo+6J5P+yvI7+jUyhwS7EiijDlp5B+px1l/wAC/ljH5nf8laYc",
  "pbPvzQ0mHyhHiP8A8zgAPwKZHD3M25fgoxeJPK2Ju+w5vM/ADzKwC67l+jQ+hTPd56SvHoP3B6nr8lk1cPXqyeLyumsec0zud/4n",
  "t9FnJhvmMpcjgqU4qUDYYWCONvYD+q50RSVCq3uqKre6MFyIiqWCIiAIiIAiIgCIiAoeoVOVXIpILeVOVXImRgt5U5VciZGC3lTk",
  "VyJkYLeVU5FeiDBYGbKvKrkTIwW8qcquRMjBbypyq5EyMFvKqgbKqJkYCIigkIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiI",
  "gCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIg",
  "CIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiA//2Q=="
].join("");
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
    return (React.createElement(Card, null,
        React.createElement(ST, { color: C.gold }, "\uD83D\uDCC4 Generate Payslip"),
        React.createElement(Alrt, { type: "info" }, "Generates an official payslip in Palian format \u2014 opens for printing/saving as PDF."),
        React.createElement(Sel, { label: "Staff Member", value: sel, onChange: e => setSel(e.target.value) },
            React.createElement("option", { value: "" }, "-- Select Staff --"),
            db.staff.filter(s => s.active).map(s => React.createElement("option", { key: s.id, value: s.id },
                s.name,
                " \u2014 ",
                s.roleLabel || s.role))),
        staff && React.createElement("div", { style: { background: "#E3F2FD", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12 } },
            React.createElement(IR, { label: "Basic Salary", value: fmt(basic) }),
            React.createElement(IR, { label: "Branch", value: staff.branch || "—" }),
            React.createElement(IR, { label: "Bank", value: staff.bank || "Not set — update in HR Staff record" })),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
            React.createElement(Sel, { label: "Pay Month", value: month, onChange: e => setMonth(e.target.value) }, months.map((m, i) => React.createElement("option", { key: i + 1, value: i + 1 }, m))),
            React.createElement(Inp, { label: "Year", type: "number", value: year, onChange: e => setYear(e.target.value) }),
            React.createElement(Inp, { label: "House Allowance (K)", type: "number", value: house, onChange: e => setHouse(e.target.value), placeholder: "0.00" }),
            React.createElement(Inp, { label: "Transport Allowance (K)", type: "number", value: transport, onChange: e => setTransport(e.target.value), placeholder: "0.00" }),
            React.createElement(Inp, { label: "Other Income (K)", type: "number", value: other, onChange: e => setOther(e.target.value), placeholder: "0.00" }),
            React.createElement(Inp, { label: "Leave Days Taken", type: "number", value: leave, onChange: e => setLeave(e.target.value), placeholder: "0" }),
            React.createElement(Inp, { label: "Xmas Bonus (K)", type: "number", value: xmas, onChange: e => setXmas(e.target.value), placeholder: "0.00" })),
        staff && total > 0 && React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 14 } }, [["Total Income", fmt(total), "#fff"], ["NAPSA 5%", fmt(napsa), "#FFB300"], ["PAYE Est.", fmt(paye), "#FF8A80"], ["Net Pay", fmt(net), "#A5D6A7"]].map(([l, v, c]) => (React.createElement("div", { key: l },
            React.createElement("div", { style: { fontSize: 8, color: "rgba(255,255,255,0.6)", fontWeight: 700, marginBottom: 3 } }, l),
            React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: c } }, v))))),
        React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement(Btn, { full: true, color: C.teal, onClick: generate }, "\uD83D\uDDA8\uFE0F Print"),
            React.createElement(Btn, { full: true, color: C.blue, onClick: generateDownload }, "\u2B07\uFE0F Download PDF"))));
}
// ── LOGIN ─────────────────────────────────────────────────────────────────────
const HERO_PHOTO = "data:image/jpeg;base64," + [
    "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"
].join("");
const FOUNDER_SKETCH = "data:image/jpeg;base64," + [
    "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",
    "IFCl1eQf/9k="
].join("");
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
function HRSystem({ db, setDb, user }) {
    const isAccountsOnly = user.role === "accounts";
    const [tab, setTab] = useState(isAccountsOnly ? "payslips" : "staff");
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
        alert(`✅ ${roleLabel} added.`);
    }
    function togStaff(id) { const nd = { ...db, staff: db.staff.map(s => s.id === id ? { ...s, active: !s.active } : s) }; saveDB(nd); setDb(nd); }
    function remStaff(id) { if (!window.confirm("Remove?"))
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
        alert("✅ Updated.");
    }
    function approveLeave(id, status) { const nd = { ...db, leaveRequests: db.leaveRequests.map(r => r.id === id ? { ...r, status, approvedBy: user.name } : r) }; saveDB(nd); setDb(nd); }
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" } }, (isAccountsOnly ? [["payslips", "💰 Payslips"], ["payroll", "📊 Payroll"]] : [["staff", "👥 Staff"], ["payslips", "💰 Payslips"], ["leave", "🏖️ Leave"], ["payroll", "📊 Payroll"], ["org", "🏢 Org"], ["audit", "🔐 Audit"]]).map(([id, lb]) => (React.createElement("button", { key: id, onClick: () => setTab(id), style: { padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${tab === id ? C.navy : C.border}`, background: tab === id ? C.navy : "white", color: tab === id ? "white" : "#333", fontWeight: 700, fontSize: 11, cursor: "pointer" } }, lb)))),
        tab === "payslips" && React.createElement(PayslipGenerator, { db: db }),
        tab === "staff" && (React.createElement("div", null,
            React.createElement(Card, { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, color: "#fff", padding: 16, marginBottom: 14 } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 } },
                    React.createElement(PalianLogo, { size: 30 }),
                    React.createElement("div", { style: { fontSize: 16, fontWeight: 800 } }, "HR Dashboard")),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 } }, [["Total", db.staff.length, "#fff"], ["Active", db.staff.filter(s => s.active).length, "#B9F6CA"], ["Inactive", db.staff.filter(s => !s.active).length, "#FF8A80"]].map(([l, v, c]) => React.createElement("div", { key: l, style: { background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 8, textAlign: "center" } },
                    React.createElement("div", { style: { fontSize: 22, fontWeight: 800, color: c } }, v),
                    React.createElement("div", { style: { fontSize: 9, opacity: 0.75 } }, l))))),
            React.createElement(Card, null,
                React.createElement(ST, null, "\u2795 Add Staff"),
                React.createElement(Inp, { label: "Full Name", req: true, value: ns.name, onChange: e => setNs(f => ({ ...f, name: e.target.value })) }),
                React.createElement(Sel, { label: "Role", req: true, value: ns.role, onChange: e => setNs(f => ({ ...f, role: e.target.value, customRole: "", province: "", town: "" })) },
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
                ns.role === "other" && React.createElement(Inp, { label: "Specify Position", req: true, value: ns.customRole, onChange: e => setNs(f => ({ ...f, customRole: e.target.value })) }),
                !isHQR(ns.role) && React.createElement(ProvinceTownSelect, { required: true, province: ns.province, town: ns.town, onProvince: p => setNs(f => ({ ...f, province: p, town: "" })), onTown: t => setNs(f => ({ ...f, town: t })) }),
                isHQR(ns.role) && React.createElement(Alrt, { type: "info" }, "Head Office role \u2014 access to all 10 provinces."),
                React.createElement(PhotoUpload, { label: "Passport-Size Photo", value: nsPhoto, onChange: setNsPhoto }),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" } },
                    React.createElement(Inp, { label: "PIN", type: "password", req: true, value: ns.pin, onChange: e => setNs(f => ({ ...f, pin: e.target.value })), placeholder: "4\u20136 digits" }),
                    React.createElement(Inp, { label: "NRC No.", value: ns.nrc, onChange: e => setNs(f => ({ ...f, nrc: e.target.value })), placeholder: "123456/78/1" }),
                    React.createElement(Inp, { label: "TPIN No.", value: ns.tpin, onChange: e => setNs(f => ({ ...f, tpin: e.target.value })) }),
                    React.createElement(Inp, { label: "Phone", value: ns.phone, onChange: e => setNs(f => ({ ...f, phone: e.target.value })), placeholder: "0977000000" }),
                    React.createElement(Inp, { label: "Email", type: "email", value: ns.email, onChange: e => setNs(f => ({ ...f, email: e.target.value })) }),
                    React.createElement(Inp, { label: "Department", value: ns.dept, onChange: e => setNs(f => ({ ...f, dept: e.target.value })), placeholder: "e.g. Loans" }),
                    React.createElement(Inp, { label: "Grade / Pay Point", value: ns.grade, onChange: e => setNs(f => ({ ...f, grade: e.target.value })), placeholder: "e.g. NP" }),
                    React.createElement(Inp, { label: "Basic Salary (K)", type: "number", value: ns.salary, onChange: e => setNs(f => ({ ...f, salary: e.target.value })), placeholder: "0.00" }),
                    React.createElement(Inp, { label: "Start Date", type: "date", value: ns.startDate, onChange: e => setNs(f => ({ ...f, startDate: e.target.value })) }),
                    React.createElement(Inp, { label: "Bank Name", value: ns.bank, onChange: e => setNs(f => ({ ...f, bank: e.target.value })), placeholder: "e.g. Zanaco" }),
                    React.createElement(Inp, { label: "Account No.", value: ns.accountNo, onChange: e => setNs(f => ({ ...f, accountNo: e.target.value })) })),
                React.createElement(Btn, { color: C.green, onClick: addStaff, full: true }, "\u2795 Add Staff Member")),
            React.createElement(Card, null,
                React.createElement(ST, null,
                    "All Staff (",
                    db.staff.length,
                    ")"),
                db.staff.map(s => (React.createElement("div", { key: s.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } }, editId === s.id ? (React.createElement("div", null,
                    React.createElement(PhotoUpload, { label: "Passport-Size Photo", value: efPhoto, onChange: setEfPhoto, small: true }),
                    React.createElement(Inp, { label: "Full Name", req: true, value: ef.name, onChange: e => setEf(f => ({ ...f, name: e.target.value })) }),
                    React.createElement(Inp, { label: "New PIN (leave blank to keep current)", type: "password", value: ef.pin, onChange: e => setEf(f => ({ ...f, pin: e.target.value })), placeholder: "Leave blank to keep current PIN" }),
                    React.createElement(Inp, { label: "NRC No.", value: ef.nrc, onChange: e => setEf(f => ({ ...f, nrc: e.target.value })) }),
                    React.createElement(Inp, { label: "TPIN No.", value: ef.tpin, onChange: e => setEf(f => ({ ...f, tpin: e.target.value })) }),
                    React.createElement(Inp, { label: "Phone", value: ef.phone, onChange: e => setEf(f => ({ ...f, phone: e.target.value })) }),
                    React.createElement(Inp, { label: "Email", type: "email", value: ef.email, onChange: e => setEf(f => ({ ...f, email: e.target.value })) }),
                    React.createElement(Inp, { label: "Bank Name", value: ef.bank, onChange: e => setEf(f => ({ ...f, bank: e.target.value })) }),
                    React.createElement(Inp, { label: "Account No.", value: ef.accountNo, onChange: e => setEf(f => ({ ...f, accountNo: e.target.value })) }),
                    React.createElement(Inp, { label: "Grade", value: ef.grade, onChange: e => setEf(f => ({ ...f, grade: e.target.value })) }),
                    !isHQR(s.role) && React.createElement(ProvinceTownSelect, { required: true, province: ef.province, town: ef.town, onProvince: p => setEf(f => ({ ...f, province: p, town: "" })), onTown: t => setEf(f => ({ ...f, town: t })) }),
                    React.createElement("div", { style: { display: "flex", gap: 8 } },
                        React.createElement(Btn, { sm: true, color: C.green, onClick: () => saveEdit(s) }, "\uD83D\uDCBE Save"),
                        React.createElement(GBtn, { onClick: () => setEditId(null) }, "Cancel")))) : (React.createElement(React.Fragment, null,
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 } },
                        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-start" } },
                            s.photoUrl && React.createElement("img", { src: s.photoUrl, alt: "", style: { width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 } }),
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: C.navy } }, s.name),
                            React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                                s.roleLabel || s.role,
                                s.dept ? " · " + s.dept : ""),
                            React.createElement("div", { style: { fontSize: 11, color: C.blue, fontWeight: 600 } },
                                "\uD83D\uDCCD ",
                                s.branch || "—",
                                s.province && s.province !== "Head Office" ? `, ${s.province}` : ""),
                            (s.phone || s.email) && React.createElement("div", { style: { fontSize: 11, color: C.muted } }, [s.phone, s.email].filter(Boolean).join(" · ")),
                            s.salary > 0 && React.createElement("div", { style: { fontSize: 11, color: C.green, fontWeight: 700 } },
                                "Salary: ",
                                fmt(s.salary),
                                "/mo",
                                s.bank ? " · " + s.bank : ""))),
                        React.createElement("span", { style: { background: s.active ? C.green : C.red, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 } }, s.active ? "🟢" : "🔴")),
                    React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" } },
                        React.createElement(Btn, { sm: true, color: C.blue, onClick: () => startEdit(s) }, "\u270F\uFE0F Edit"),
                        React.createElement(Btn, { sm: true, color: s.active ? C.orange : C.green, onClick: () => togStaff(s.id) }, s.active ? "Deactivate" : "Activate"),
                        s.salary > 0 && React.createElement(Btn, { sm: true, color: C.teal, onClick: () => openPayslip(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "\uD83D\uDCB0 Quick Payslip"),
                        s.salary > 0 && React.createElement(Btn, { sm: true, color: C.blue, onClick: () => downloadPayslipPDF(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "\u2B07\uFE0F Download"),
                        s.id !== "hr001" && React.createElement(Btn, { sm: true, color: C.red, onClick: () => remStaff(s.id) }, "Remove")))))))))),
        tab === "leave" && (React.createElement(Card, null,
            React.createElement(ST, { color: C.teal }, "\uD83C\uDFD6\uFE0F Leave Requests"),
            (db.leaveRequests || []).length === 0 ? React.createElement(Alrt, { type: "info" }, "No leave requests.") : (db.leaveRequests || []).slice().reverse().map(r => (React.createElement("div", { key: r.id, style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontWeight: 700, color: C.navy } }, r.staffName),
                        React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                            r.type,
                            " \u00B7 ",
                            r.from,
                            " to ",
                            r.to)),
                    React.createElement("span", { style: { background: r.status === "Approved" ? C.green : r.status === "Rejected" ? C.red : C.gold, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 } }, r.status)),
                React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 8 } },
                    "Reason: ",
                    r.reason),
                r.status === "Pending" && React.createElement("div", { style: { display: "flex", gap: 8 } },
                    React.createElement(Btn, { sm: true, color: C.green, onClick: () => approveLeave(r.id, "Approved") }, "\u2705 Approve"),
                    React.createElement(Btn, { sm: true, color: C.red, onClick: () => approveLeave(r.id, "Rejected") }, "\u274C Reject"))))))),
        tab === "payroll" && (React.createElement(Card, null,
            React.createElement(ST, { color: C.gold }, "\uD83D\uDCCA Payroll"),
            React.createElement(IR, { label: "Active Staff", value: db.staff.filter(s => s.active).length }),
            React.createElement(IR, { label: "Monthly Payroll", value: fmt(db.staff.filter(s => s.active && s.salary).reduce((s, x) => s + x.salary, 0)), bold: true }),
            db.staff.filter(s => s.salary > 0).map(s => (React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, s.name),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                        s.roleLabel || s.role,
                        " \u00B7 ",
                        s.branch || "—")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                    React.createElement("div", { style: { fontWeight: 700, color: C.green } }, fmt(s.salary)),
                    React.createElement(Btn, { sm: true, color: C.teal, onClick: () => openPayslip(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "\uD83D\uDCB0 Slip"),
                    React.createElement(Btn, { sm: true, color: C.blue, onClick: () => downloadPayslipPDF(s, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }) }, "\u2B07\uFE0F"))))))),
        tab === "org" && (React.createElement(Card, null,
            React.createElement(ST, { color: C.purple }, "\uD83C\uDFE2 Organisation Chart"),
            ["ceo", "admin", "director", "strategic", "hr", "accounts", "manager", "officer", "consultant"].map(role => {
                const members = db.staff.filter(s => s.role === role && s.active);
                if (!members.length)
                    return null;
                const rc = { ceo: C.purple, admin: "#B71C1C", director: "#AD1457", strategic: C.teal, manager: C.navy, hr: C.teal, accounts: C.green, officer: C.blue, consultant: C.orange };
                return (React.createElement("div", { key: role, style: { marginBottom: 16 } },
                    React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 } },
                        role === "ceo" ? "CEO" : role.charAt(0).toUpperCase() + role.slice(1),
                        " (",
                        members.length,
                        ")"),
                    members.map(s => (React.createElement("div", { key: s.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.light, borderRadius: 8, marginBottom: 6, borderLeft: `4px solid ${rc[role] || C.muted}` } },
                        React.createElement("div", { style: { width: 32, height: 32, borderRadius: 50, background: rc[role] || C.muted, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 } }, s.name.charAt(0)),
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, s.name),
                            React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                                s.roleLabel || s.role,
                                " \u00B7 \uD83D\uDCCD",
                                s.branch || "—")))))));
            }))),
        tab === "audit" && (React.createElement(Card, null,
            React.createElement(ST, { color: C.red }, "\uD83D\uDD10 Login Audit"),
            (db.loginLogs || []).length === 0 ? React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "No records yet.") : (db.loginLogs || []).slice().reverse().slice(0, 50).map((log, i) => (React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: C.navy } }, log.name),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                        log.roleLabel || log.role,
                        " \u00B7 \uD83D\uDCCD ",
                        log.branch || "—"),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted } },
                        log.date,
                        " at ",
                        log.time)),
                React.createElement("span", { style: { background: "#E8F5E9", color: C.green, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 } }, "\u2705"))))))));
}
// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
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
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 16, color: C.navy } }, "Transport"),
                    React.createElement("div", { style: { fontSize: 12, color: C.muted } }, "Send & track parcels between towns")))),
        React.createElement("button", { onClick: onLogout, style: { background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 32, cursor: "pointer" } }, "Logout")));
}
// ── NEW PARCEL FORM ────────────────────────────────────────────────────────────
function NewParcelForm({ user, onBooked }) {
    const originInfo = isHO(user.role) ? null : gBI(user.branch);
    const [originProvince, setOriginProvince] = useState(originInfo ? originInfo.province : "");
    const [originTown, setOriginTown] = useState(isHO(user.role) ? "" : user.branch);
    const [destProvince, setDestProvince] = useState("");
    const [destTown, setDestTown] = useState("");
    const [f, setF] = useState({ senderName: "", senderNrc: "", senderPhone: "", receiverName: "", receiverPhone: "", description: "", price: "" });
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
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
        const row = { tracking_no: trackingNo, sender_name: f.senderName.trim(), sender_nrc: f.senderNrc.trim().toUpperCase(), sender_phone: f.senderPhone.trim(), receiver_name: f.receiverName.trim(), receiver_phone: f.receiverPhone.trim(), origin_branch: originTown, origin_province: originProvince, origin_code: oInfo.townCode, dest_branch: destTown, dest_province: destProvince, dest_code: dInfo.townCode, description: f.description.trim(), photo_url: photoUrl, price: parseFloat(f.price) || 0, status: "Booked", booked_by: user.name };
        await saveParcelRow(row);
        setBusy(false);
        setDone(row);
        setF({ senderName: "", senderNrc: "", senderPhone: "", receiverName: "", receiverPhone: "", description: "", price: "" });
        setPhoto(null);
        setDestProvince("");
        setDestTown("");
    }
    if (done)
        return (React.createElement(Card, { style: { textAlign: "center", padding: 32 } },
            React.createElement("div", { style: { fontSize: 40 } }, "\u2705"),
            React.createElement("div", { style: { fontWeight: 800, fontSize: 17, color: C.green, marginTop: 8, marginBottom: 4 } }, "Parcel Booked!"),
            React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: C.navy, letterSpacing: 1, marginBottom: 16 } }, done.tracking_no),
            React.createElement(IR, { label: "From", value: `${done.origin_branch}, ${done.origin_province}` }),
            React.createElement(IR, { label: "To", value: `${done.dest_branch}, ${done.dest_province}` }),
            React.createElement(IR, { label: "Receiver", value: `${done.receiver_name} · ${done.receiver_phone}` }),
            React.createElement(Btn, { full: true, color: C.navy, style: { marginTop: 16 }, onClick: () => setDone(null) }, "\u2795 Book Another Parcel")));
    return (React.createElement(Card, null,
        React.createElement(ST, null, "\uD83D\uDCE6 Book New Parcel"),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px", borderLeft: `3px solid ${C.blue}`, paddingLeft: 8 } }, "Origin (sending from)"),
        React.createElement(ProvinceTownSelect, { required: true, province: originProvince, town: originTown, onProvince: setOriginProvince, onTown: setOriginTown }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "4px 0 8px", borderLeft: `3px solid ${C.orange}`, paddingLeft: 8 } }, "Destination"),
        React.createElement(ProvinceTownSelect, { required: true, province: destProvince, town: destTown, onProvince: setDestProvince, onTown: setDestTown }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.teal}`, paddingLeft: 8 } }, "Sender"),
        React.createElement(Inp, { label: "Sender Full Name", req: true, value: f.senderName, onChange: e => setF(x => ({ ...x, senderName: e.target.value })) }),
        React.createElement(Inp, { label: "Sender NRC", req: true, value: f.senderNrc, onChange: e => setF(x => ({ ...x, senderNrc: e.target.value.toUpperCase() })), placeholder: "123456/78/1" }),
        React.createElement(Inp, { label: "Sender Phone", value: f.senderPhone, onChange: e => setF(x => ({ ...x, senderPhone: e.target.value })) }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.purple}`, paddingLeft: 8 } }, "Receiver"),
        React.createElement(Inp, { label: "Receiver Full Name", req: true, value: f.receiverName, onChange: e => setF(x => ({ ...x, receiverName: e.target.value })) }),
        React.createElement(Inp, { label: "Receiver Phone", req: true, value: f.receiverPhone, onChange: e => setF(x => ({ ...x, receiverPhone: e.target.value })), placeholder: "For arrival SMS notification", note: "Used to notify them when the parcel arrives" }),
        React.createElement("div", { style: { fontWeight: 700, fontSize: 12, color: C.navy, margin: "12px 0 8px", borderLeft: `3px solid ${C.gold}`, paddingLeft: 8 } }, "Parcel"),
        React.createElement(PhotoUpload, { label: "Parcel Photo", value: photo, onChange: setPhoto }),
        React.createElement(Inp, { label: "Description", value: f.description, onChange: e => setF(x => ({ ...x, description: e.target.value })), placeholder: "e.g. Documents, clothing, electronics" }),
        React.createElement(Inp, { label: "Price Charged (K)", type: "number", value: f.price, onChange: e => setF(x => ({ ...x, price: e.target.value })), placeholder: "0.00" }),
        React.createElement(Btn, { full: true, color: C.navy, onClick: submit, disabled: busy }, busy ? "⏳ Booking..." : "📦 Book Parcel")));
}
// ── PARCEL LIST / TRACKING / STATUS ───────────────────────────────────────────
function ParcelList({ user }) {
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [sf, setSf] = useState("");
    const [sel, setSel] = useState(null);
    const [collectNrc, setCollectNrc] = useState("");
    async function refresh() { setLoading(true); const p = await loadParcels(); setParcels(p); setLoading(false); }
    useEffect(() => { refresh(); }, []);
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
        const arrivalMsg = `Dear ${p.receiver_name}, your parcel ${p.tracking_no} from ${p.origin_branch} has ARRIVED at ${p.dest_branch}. Please collect it with your ID. — Palian Transport`;
        return (React.createElement("div", null,
            React.createElement(GBtn, { onClick: () => setSel(null), style: { marginBottom: 14 } }, "\u2190 All Parcels"),
            React.createElement(Card, null,
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 18, color: C.navy } }, p.tracking_no),
                    React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 } }, p.status)),
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
                React.createElement(IR, { label: "Price", value: fmt(p.price) }),
                React.createElement(IR, { label: "Booked By", value: p.booked_by }),
                React.createElement(IR, { label: "Booked", value: p.booked_date ? new Date(p.booked_date).toLocaleString() : "—" }),
                p.arrived_date && React.createElement(IR, { label: "Arrived", value: new Date(p.arrived_date).toLocaleString() }),
                p.collected_date && React.createElement(IR, { label: "Collected", value: new Date(p.collected_date).toLocaleString() }),
                React.createElement("div", { style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 10 } },
                    p.status === "Booked" && React.createElement(Btn, { color: C.amber, onClick: () => advance(p, "In Transit") }, "\uD83D\uDE9A Mark In Transit"),
                    p.status === "In Transit" && React.createElement(Btn, { color: C.teal, onClick: () => advance(p, "Arrived") }, "\uD83D\uDCCD Mark Arrived"),
                    p.status === "Arrived" && React.createElement("a", { href: smsLink(p.receiver_phone, arrivalMsg), style: { textDecoration: "none" } },
                        React.createElement(Btn, { full: true, color: C.blue }, "\uD83D\uDCF1 Notify Receiver via SMS")),
                    p.status === "Arrived" && React.createElement("div", { style: { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12 } },
                        React.createElement(Inp, { label: "Collector's NRC (verify before handing over)", value: collectNrc, onChange: e => setCollectNrc(e.target.value.toUpperCase()), placeholder: "123456/78/1" }),
                        React.createElement(Btn, { full: true, color: C.green, onClick: () => advance(p, "Collected") }, "\u2705 Mark Collected")),
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
                    React.createElement("span", { style: { background: PSC[p.status] || C.muted, color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" } }, p.status))))));
}
// ── TRANSPORT APP (separate module) ───────────────────────────────────────────
function TransportApp({ user, onLogout, onSwitch }) {
    const [tab, setTab] = useState("new");
    return (React.createElement("div", { style: { fontFamily: "'Segoe UI',Arial,sans-serif", background: C.light, minHeight: "100vh" } },
        React.createElement("div", { style: { background: C.teal, color: "#fff", textAlign: "center", padding: "5px 8px", fontSize: 11, fontWeight: 700 } },
            "\uD83D\uDCE6 TRANSPORT SYSTEM \u2014 ",
            user.name),
        React.createElement("div", { style: { background: `linear-gradient(135deg,${C.navy},${C.blue})`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 200 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement(PalianLogo, { size: 34 }),
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 13, color: "#fff" } }, "PALIAN TRANSPORT")),
                React.createElement("div", { style: { display: "flex", gap: 10 } },
                    React.createElement("button", { onClick: onSwitch, style: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" } }, "Switch"),
                    React.createElement("button", { onClick: onLogout, style: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" } }, "Logout")))),
        React.createElement("div", { style: { background: C.navy, display: "flex", borderBottom: `3px solid ${C.orange}` } }, [["new", "➕ New Parcel"], ["all", "📦 All Parcels"]].map(([id, lb]) => (React.createElement("button", { key: id, onClick: () => setTab(id), style: { flex: 1, padding: "11px 8px", background: "none", border: "none", color: tab === id ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 12, cursor: "pointer", borderBottom: tab === id ? `3px solid ${C.orange}` : "3px solid transparent", marginBottom: -3 } }, lb)))),
        React.createElement("div", { style: { padding: 14, maxWidth: 720, margin: "0 auto" } },
            tab === "new" && React.createElement(NewParcelForm, { user: user, onBooked: () => { } }),
            tab === "all" && React.createElement(ParcelList, { user: user }))));
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

// ── MAIN APP ──────────────────────────────────────────────────────────────────
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
