now we need to add multiple organizations users using application at same time

Yes. That is exactly what the **shared cloud runtime + separate database per organization** architecture is designed for.

Multiple organizations can use UIAP **simultaneously**, with their requests isolated and processed independently.

### Example

At the same moment:

```text
College A
  ├── 20 teachers
  ├── 2 admins
  └── 5 ESP32 devices

College B
  ├── 40 teachers
  ├── 3 admins
  └── 8 ESP32 devices

College C
  ├── 15 teachers
  ├── 1 admin
  └── 3 ESP32 devices
```

All are connected to the **same UIAP Cloud application**:

```text
                    Internet
                       │
          ┌────────────▼────────────┐
          │    UIAP Cloud Runtime   │
          │                         │
          │ Node.js / Express       │
          │ Core                    │
          │ ModuleRuntime           │
          │ EventDispatcher         │
          └────────────┬────────────┘
                       │
              Organization Resolver
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Org A         Org B         Org C
          │            │            │
          ▼            ▼            ▼
       DB-A          DB-B          DB-C
```

## How simultaneous requests work

Suppose three requests arrive at almost exactly the same time:

```text
College A teacher
GET /attendance
        │
College B teacher
GET /attendance
        │
College C ESP32
POST /device/events
        │
        ▼
   UIAP Cloud
```

The server doesn't process them as:

```text
A → finish
B → finish
C → finish
```

and make everyone wait.

Node.js/Express handles multiple requests concurrently, while PostgreSQL handles concurrent database operations.

Conceptually:

```text
Request A ────────────────► DB-A
Request B ────────────────► DB-B
Request C ────────────────► DB-C
```

The databases are completely separate.

---

# Organization context must be attached to every request

This is the most important part of the cloud design.

For example:

```text
college-a.uiap.example
```

resolves to:

```text
ORG-001
```

and:

```text
college-b.uiap.example
```

resolves to:

```text
ORG-002
```

Then the request pipeline is:

```text
Request
   ↓
Organization Resolver
   ↓
Authentication
   ↓
RBAC
   ↓
Select organization database
   ↓
Module
   ↓
Database
```

So when College A asks for students:

```text
ORG-001
   ↓
uiap_org_001
   ↓
students
```

College B's request:

```text
ORG-002
   ↓
uiap_org_002
   ↓
students
```

There is no reason for College B to ever query `uiap_org_001`.

---

# Users are also organization-specific

We should **not have one global `admin` user shared across organizations**.

Instead:

```text
ORG-001
├── admin
├── teacher01
└── teacher02

ORG-002
├── admin
├── teacher01
└── teacher02
```

`admin` can exist in both organizations because they are in different databases.

So:

```text
ORG-001 + admin
```

and:

```text
ORG-002 + admin
```

are completely different accounts.

---

# Modules work simultaneously too

This is where our current architecture becomes powerful.

The Attendance module is loaded **once** in the cloud runtime:

```text
UIAP Cloud
│
├── Core
├── ModuleRuntime
│
├── College Management Module
├── Attendance Module
├── Biometric Module
└── Reports Module
```

It doesn't need:

```text
Attendance-A
Attendance-B
Attendance-C
```

Instead, the same module handles requests for different organizations.

```text
                 Attendance Module
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           ORG-001    ORG-002    ORG-003
             │          │          │
             ▼          ▼          ▼
            DB-A       DB-B       DB-C
```

That saves RAM and CPU.

---

# Events work the same way

Suppose five ESP32 devices from different organizations send events:

```text
ESP32 A1 → ORG-001
ESP32 A2 → ORG-001
ESP32 B1 → ORG-002
ESP32 C1 → ORG-003
ESP32 C2 → ORG-003
```

The event should carry its organization context:

```json
{
  "organizationId": "ORG-002",
  "deviceId": "device-b1",
  "eventId": "evt-123",
  "sensorSlotId": 37,
  "timestamp": "..."
}
```

The server then processes:

```text
ORG-002
   ↓
DB-B
   ↓
Biometric
   ↓
Attendance
```

while another organization's event can be processed independently.

---

# We should use connection pooling carefully

This is one area where low-resource hosting matters.

We **shouldn't create a new PostgreSQL connection for every request**.

Instead:

```text
UIAP Runtime
      │
Connection Pool Manager
      │
 ┌────┼────┐
 ▼    ▼    ▼
DB-A DB-B DB-C
```

Connections are reused.

And we should put limits on each organization's pool rather than allowing one busy organization to consume all PostgreSQL connections.

For example conceptually:

```text
ORG-A → small pool
ORG-B → small pool
ORG-C → small pool
```

with a global maximum.

This will be important when we implement cloud multi-tenancy.

---

# What happens if one organization is extremely busy?

Suppose:

```text
College A → 1,000 users
College B → 20 users
College C → 30 users
```

College A shouldn't be able to consume all server resources.

We need:

```text
Per-organization limits
        │
        ├── database connections
        ├── request rate
        ├── event ingestion
        ├── report jobs
        └── storage
```

This is also useful for your eventual licensing system.

---

# Reports need special treatment

Normal API requests can be lightweight:

```text
GET students
GET today's attendance
```

But a huge report can consume CPU and database resources.

So eventually:

```text
Generate Report
      ↓
Job Queue
      ↓
Background Worker
      ↓
Database
      ↓
Report ready
```

rather than making the HTTP request wait for several seconds/minutes.

This is especially important when many organizations are using the same server.

---

# Our final cloud model

```text
                 UIAP DEVELOPER CLOUD
                    CONTROL PLANE
                         │
             licenses / organizations
                         │
                         ▼
              ┌─────────────────────┐
              │ UIAP CLOUD RUNTIME  │
              │                     │
              │ One Node process    │
              │ One ModuleRuntime   │
              │ Shared modules      │
              │ Event dispatcher    │
              └──────────┬──────────┘
                         │
               Organization Resolver
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
     ORG-001          ORG-002          ORG-003
        │                │                │
        ▼                ▼                ▼
   PostgreSQL DB    PostgreSQL DB    PostgreSQL DB
     uiap_001         uiap_002         uiap_003
        │                │                │
        ▼                ▼                ▼
    College A        College B        College C
```

So **yes: multiple organizations, multiple users, and multiple ESP32 devices can all use UIAP at the same time**.

The important architectural rule is:

> **Share the application runtime and modules; isolate the organization's data and database.**

That gives us much better hosting efficiency without sacrificing organization-level database isolation.
