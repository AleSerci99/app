# PRD — Rapportini (Work Reports App)

## Original Problem Statement
App mobile per rapportini di lavoro. Ogni utente inserisce i propri rapporti (data, cantiere,
ore lavorate, guidato mezzo sì/no, descrizione lavorazioni). L'utente vede/modifica/elimina solo
i rapportini del mese in corso; al cambio del mese non vede più nulla. L'amministratore vede i
rapportini di tutti, di tutti i mesi e cantieri, può modificarli e approvarli (l'utente non vede
la modifica dell'admin). L'admin ha un report tabellare del mese in corso: dipendenti × giorni con
le ore lavorate, esportabile in PDF/Excel.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT bearer auth (pyjwt), bcrypt password hashing.
  UUID string ids. Soft deletes (`deleted_at`). Exports via openpyxl (xlsx) and reportlab (pdf).
- **Frontend**: Expo Router (file-based), React Query, react-native-keyboard-controller,
  @react-native-vector-icons/feather. Role-based route groups: `(auth)`, `(employee)`, `(admin)`.
  Light + Dark theme (blue/green/yellow brand) via `src/theme.ts`, in-app toggle (system/light/dark).
- **Auth model**: self-register (employee, approved=false) → admin approves → login.
  Seeded admin: `admin@rapportini.it` / `Admin1234!`.

## User Personas
- **Dipendente (employee)**: logs daily work reports for the current month.
- **Amministratore (admin)**: reviews/edits/approves all reports, manages cantieri & users, exports.

## Core Requirements (static)
- Email/password auth with roles; admin-approved registration.
- Report fields: date, cantiere (from admin list), hours, drove-vehicle flag, description.
- Employee: view/edit/delete current-month reports only; past months hidden.
- Admin: view all reports (all months/sites), edit (stored separately — invisible to employee), approve.
- Admin monthly matrix (employees × days) with PDF/Excel export.
- Admin manages cantieri list and user approvals/roles.
- Dark/light theme toggle.

## Implemented (2026-09-05)
- Full JWT auth: register/login/me, approval gating, seeded admin.
- Cantieri CRUD (admin) + list for all approved users.
- Employee reports: create (current-month only), list (current month), edit, soft-delete.
- Admin reports: list with month/cantiere/status filters, edit (separate admin_fields), approve toggle.
- Admin matrix endpoint + PDF/Excel export (base64 → share/download).
- Admin user management: approve/suspend, promote/demote, soft-delete (self-protected).
- Full themed UI: login (hero + scrim), employee home + form (day picker, cantiere sheet, switch),
  admin dashboard, matrix table (frozen name column, horizontal scroll), manage (users/cantieri),
  profile with theme toggle + logout. Toasts, confirm dialogs, empty/loading/error states.
- Verified: 25/25 backend tests pass; employee never sees admin edits.

## Backlog / Remaining
- **P1**: Cantiere filter on matrix; per-employee monthly detail drill-down; report notes/photos.
- **P2**: Weekly/period totals; overtime rules; CSV export; search by employee.
- **P2**: Email notification to admin on new registration (Emergent Resend).

## Next Tasks
- Await user feedback; consider photo attachments on reports (Object Storage) and approval-all action.
