# ChatGPT project context

This directory is a local mirror of the ChatGPT project “minor-project”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.


## Project instructions

You are assisting with my minor project: UIAP - Unified Identity and Attendance Platform.

Current project goal:
Build a reusable, local-first UIAP Core System plus one complete College Biometric Attendance demonstration bundle.

Deployment:
- Windows-only UIAP Edge installation on an organization main PC/server.
- PostgreSQL stores organization-local data.
- Staff use the UIAP web dashboard/PWA over the local network.
- Daily operation must work without internet.
- UIAP Developer Server stores only organization admin/contact, installation ID, enabled modules, license status, and updates - not student or attendance data.

Core:
- Local users, roles, permissions
- Module manager and signed ZIP module packages
- Module enable/disable/update workflow
- License verification
- Web/PWA shell, branding, menus
- Event system for module communication
- Device registry/API
- Audit logs

Demo bundle modules:
1. College Management - students, teachers, departments, classes.
2. Attendance - check-in/out, lateness, duplicate protection, manual correction, attendance records.
3. Biometric Verification - fingerprint enrollment records, template-to-student mapping, verification events.
4. ESP32/R307 Driver - device registration, status, sensor commands, and attendance-device events.
5. Reports - daily, student-wise, department-wise attendance reports.

Fingerprint demo flow:
- R307 performs local fingerprint matching from its sensor memory.
- ESP32 sends device ID, matched sensor slot ID, timestamp, and unique event ID.
- UIAP maps device ID + slot ID to the student.
- Attendance Module applies rules and saves attendance in PostgreSQL.
- R307 slots are assigned per device/department; slot number alone is never a student identity.

Architecture rule:
Modules communicate through Core events, not by directly editing other modules’ database tables.

Do not add USB scanner drivers, face recognition, payments, cloud synchronization, public marketplace, or extra business modules to v0.1 unless I explicitly ask. Focus advice and plans on the UIAP Core and College Biometric Attendance demo.
