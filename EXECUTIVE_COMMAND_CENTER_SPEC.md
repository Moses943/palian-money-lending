# PALIAN MONEY LENDING LIMITED — CEO & Director Executive Command Center

Original master prompt submitted for this feature, kept here for reference so
future work (in this repo, in Claude, or otherwise) can be checked against
the full original scope.

## Implementation status (as of this build)

**Built — desktop sidebar console at the "🎯 Executive" tab, ceo/director roles only:**
- CEO Dashboard / Director Dashboard (KPIs, company performance chart, provincial performance, focus lists)
- Approval Center (aggregates existing Accounts withdrawal dual-approval queue — Director → CEO — does not duplicate or bypass it)
- Company Overview / Performance
- Provinces, Branches (reuses existing AdminProvincialView / AdminBranchView)
- Loans Overview, Recovery Overview (incl. major-case ranking by outstanding balance)
- HR Overview (staff by role, pending leave)
- Finance Overview (bank balance, money accounts, recent transactions)
- Notifications, Audit Trail (login activity)

**Not yet built — structural placeholders only ("Coming Soon"), each needs new Supabase tables:**
- Projects Overview
- M&E Overview
- Risks & Compliance
- Executive Tasks
- Decisions Register
- Reports (dedicated executive report generation)
- Documents
- System Settings (exec-specific)

**Note on financial figures:** the system has no revenue/expense (P&L) ledger.
"Revenue (YTD)" and "Net Position" in the original mockup were substituted
with real, defensible fields already in the schema — Interest Expected
(sum of `loans.interest`) and Bank Balance (`db.bankBalance`) — rather than
fabricated numbers. A real P&L view needs a schema decision first.

---

## Original prompt

Below is the prompt as submitted, in full.

> I already have an existing PALIAN MONEY LENDING LIMITED system.
>
> I do NOT want you to create a completely separate application or duplicate the existing modules.
>
> I want you to ADD a new CEO & Director Executive Command Center to the existing Palian system and connect it to the existing modules, database, authentication and user roles wherever possible.
>
> Before changing anything, inspect the existing project carefully and understand its current architecture, database, authentication, modules, APIs, user roles and permissions.
>
> Do not destroy or replace existing functionality.
>
> ### OBJECTIVE
>
> Create: PALIAN MONEY LENDING LIMITED — CEO & DIRECTOR EXECUTIVE COMMAND CENTER
>
> This should become the executive control center of the existing Palian system. The CEO and Director should be able to see information coming from the existing: Finance/Accounts, Loan Management, Recovery Management, Provincial Management, Branch Management, HR, M&E, Project Management, Staff/Users, Reports, Documents, Notifications.
>
> Do NOT duplicate data unnecessarily. Where the existing system already has the information, retrieve it from the existing database/API/module. Where an integration is required, create a clean API/service layer.
>
> The CEO and Director are NOT ordinary users of the departmental systems. They have an executive-level interface that aggregates information from the existing Palian system, providing: DASHBOARD → MONITORING → REPORTS → ALERTS → APPROVALS → DECISIONS → TASKS → FOLLOW-UP
>
> ### 1. CEO WORKSPACE
> CEO dashboard shows Company Overview (total portfolio, outstanding loans, collections, recovery, defaults, revenue, expenses, net position, active clients, staff, provinces, branches, projects), Performance (targets vs actual, achievement %, provincial/branch/department/loan/recovery/project performance, HR overview, M&E results), and a CEO Attention Required alert area (critical financial matters, major defaults, serious recovery cases, provinces/branches below target, project delays, major HR issues, M&E discrepancies, compliance risks, pending CEO approvals) with drill-down into the relevant module.
>
> ### 2. CEO ACTIONS
> Approve / Reject / Return requests, Comment, assign executive tasks, create executive decisions, review reports/risks/projects/HR/M&E/recovery/financial information, monitor provinces/branches, generate executive reports. CEO should NOT perform routine departmental work.
>
> ### 3–4. DIRECTOR WORKSPACE & ACTIONS
> Director dashboard: OPERATIONS + IMPLEMENTATION + SUPERVISION + FIRST-LEVEL APPROVAL — provincial/branch/loan/recovery/project performance, collections, HR issues, M&E findings, staff performance, operational problems, pending Director approvals, tasks, escalations to CEO. Director can review operational reports, approve first-level requests, reject/return, comment, assign operational tasks, monitor managers, review finance, escalate to CEO. Director should NOT automatically have CEO-level authority.
>
> ### 5. CEO VS DIRECTOR PERMISSIONS
> Strict role-based permissions. CEO: company-wide visibility, final executive approval, strategic decision authority, risk oversight, executive task assignment, executive report access, full provincial/branch overview. Director: company operational visibility, first-level executive approval, operational task assignment, provincial/branch supervision, operational decision authority within configured limits, escalation authority to CEO. The two roles must not be identical.
>
> ### 6. FINANCIAL APPROVAL WORKFLOW (mandatory security rule)
> ACCOUNTS → SUBMIT FINANCIAL REQUEST → DIRECTOR APPROVAL → CEO APPROVAL → PAYMENT AUTHORIZED → FINANCE RELEASES MONEY. Finance must NOT release money before both approvals. Backend must enforce: `DirectorApproval === APPROVED AND CEOApproval === APPROVED` → `PaymentStatus = AUTHORIZED`, else `PaymentStatus = LOCKED`. Finance must not have an override; not just a hidden/disabled frontend button — the backend/API/payment service must reject unauthorized payment attempts.
>
> ### 7. APPROVAL CENTER
> Director view: requests awaiting Director approval / approved / rejected / returned / escalated to CEO. CEO view: requests awaiting CEO approval / approved / rejected / returned / completed. Each request shows request number, department, province, branch, requester, amount, purpose, supporting documents, Director decision, CEO decision, current status.
>
> ### 8. PROVINCIAL MANAGEMENT
> Connect to existing Provincial Management module. CEO and Director view province, provincial manager, branches, staff, portfolio, collections, recovery, targets, actual, achievement %, projects, HR issues, M&E findings. Both see all provinces. Do not duplicate provincial records.
>
> ### 9. HR EXECUTIVE OVERVIEW
> Connect to existing HR system. Show total staff, new employees, staff leaving, vacancies, attendance summary, leave summary, performance, training, contracts expiring, critical HR issues. Clicking an item opens the relevant HR module/page if supported. Do not copy the entire HR database.
>
> ### 10. M&E EXECUTIVE OVERVIEW
> Connect to existing M&E system. Show organizational/provincial/branch KPIs, targets, actuals, achievement %, data quality, reporting compliance, performance gaps, recommendations. Example: Reported performance 95%, M&E verified 87%, Status: DATA DISCREPANCY. CEO and Director should see the M&E verification independently.
>
> ### 11. PROJECT MANAGEMENT OVERVIEW
> Connect to existing Project Management system. Show active projects, completion %, budget, expenditure, milestones, delays, risks, beneficiaries, project manager, decisions required. CEO handles strategic project decisions; Director handles operational project oversight.
>
> ### 12. RECOVERY EXECUTIVE OVERVIEW
> Connect to existing Recovery Management system. Show total overdue/defaulted, amount to recover/recovered, recovery rate/target, major recovery cases, provincial/branch recovery performance, Recovery Manager performance. CEO sees major/high-risk cases; Director monitors operational recovery.
>
> ### 13. LOAN EXECUTIVE OVERVIEW
> Connect to existing Loan Management system. Show total portfolio, active/new/completed/overdue/defaulted loans, collection rate, portfolio at risk, province/branch/consultant performance. CEO and Director should normally monitor rather than process individual loans.
>
> ### 14. EXECUTIVE TASK CENTER
> CEO assigns tasks to Director, Provincial Managers, Department Managers, Project/Recovery/HR/M&E/Finance Managers. Director assigns operational tasks. Each task: ID, description, assigned person, department, province, priority, deadline, status, completion %, comments, attachments.
>
> ### 15. EXECUTIVE DECISION REGISTER
> Fields: decision number, date, issue, decision, responsible person, deadline, status, follow-up, supporting documents. CEO creates strategic decisions; Director creates operational decisions within permission.
>
> ### 16. RISK & COMPLIANCE
> Executive Risk Register tracking risk, department, province, branch, severity, probability, impact, responsible person, mitigation, status. CEO sees all critical risks; Director manages operational mitigation.
>
> ### 17. EXECUTIVE REPORTS
> CEO Monthly Executive Report: company performance, financial overview, loan portfolio, recovery, provincial/branch performance, HR, M&E, projects, risks, decisions, recommendations. Director Monthly Operations Report: operations, provinces, branches, loans, recovery, projects, HR, M&E, operational challenges, actions taken, matters escalated to CEO. Reports use real data from the existing system.
>
> ### 18–21. DASHBOARD DESIGN / LAYOUT / DRILL-DOWN
> Header: PALIAN MONEY LENDING LIMITED / CEO & DIRECTOR EXECUTIVE COMMAND CENTER. Sidebar: CEO Dashboard, Director Dashboard, Approval Center, Company Overview, Provinces, Branches, Performance, Loans Overview, Recovery Overview, Projects Overview, HR Overview, M&E Overview, Finance Overview, Risks & Compliance, Executive Tasks, Decisions Register, Reports, Documents, Notifications, Audit Trail, Settings — only authorized menus per role. CEO KPI cards: Total Portfolio, Collection Rate, Recovery Rate, Revenue, Net Position, Active Clients. Director KPI cards: Portfolio, Collections, Recovery, Active Branches, Staff, Operational Issues. Do not overload the dashboard — use drill-down (e.g. Recovery Rate → Province → Branch → existing Recovery System).
>
> ### 22–23. NOTIFICATIONS & AUDIT TRAIL
> CEO notifications: financial request awaiting CEO approval, critical recovery issue, province below target, major project delay, critical HR issue, M&E discrepancy, compliance risk. Director notifications: financial request awaiting Director approval, provincial report submitted, branch below target, recovery issue, project delay, HR issue, M&E issue. Existing audit system extended to record executive actions (login/logout, approval, rejection, return, comment, decision, task assignment, report approval, permission changes, financial actions, payment release). Audit history must not be editable by ordinary users.
>
> ### 24–27. DO NOT DUPLICATE / BACKWARD COMPATIBILITY / SECURITY / INTEGRATION
> Before creating anything: inspect existing codebase, modules, database tables/models, APIs, authentication, roles, dashboards, financial workflows — reuse existing infrastructure wherever possible. Do not create duplicate clients, loans, employees, provinces, branches, financial records, projects, recovery records unless technically necessary. Do not break existing functionality; back up schema, review migrations/relationships, test existing modules/auth/permissions before modifying the database; do not delete existing data. Use role-based access control, server-side authorization, secure authentication, password hashing, secure API endpoints, input validation, audit logs, session management, rate limiting, file security — never trust frontend permissions; every CEO/Director action authorized on the backend. If existing modules (HR, M&E, Projects, Recovery, Finance, Accounts, Loans, Provincial, Branch) exist, connect to them; if some don't exist yet, create integration interfaces so they can be added later. Use a modular architecture.
>
> ### 28. DEVELOPMENT PROCESS
> Do NOT immediately start rewriting the application. Step 1: inspect the existing application. Step 2: provide a report (existing architecture, modules, database, authentication, roles, APIs, what can be reused, what must be added/modified). Step 3: create an integration plan. Step 4: database migrations only where necessary. Step 5: build CEO Command Center. Step 6: build Director Command Center. Step 7: connect the Approval Center. Step 8: connect existing departmental modules. Step 9: implement backend authorization. Step 10: test every role and workflow.
>
> ### 29–30. FINAL ARCHITECTURE & REQUIREMENT
> Executive Command Center sits as the top layer above HR / M&E / Projects / Recovery / Finance / Loans / Provincial System / Branch System (departmental systems remain the operational layers). The result must not look like a generic admin dashboard — it must feel like an executive management system for a real company, where: CEO = STRATEGIC CONTROL + FINAL EXECUTIVE APPROVAL; DIRECTOR = OPERATIONAL CONTROL + FIRST-LEVEL EXECUTIVE APPROVAL; DEPARTMENTS = DAILY OPERATIONS; FINANCE = PAYMENT EXECUTION ONLY AFTER REQUIRED APPROVALS. Do not create a separate duplicate Palian application — integrate this Executive Command Center into the existing Palian system.
