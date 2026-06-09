# Test Management Tool — v2.0

> A full-stack, production-ready test lifecycle management platform built with **Spring Boot 3.2** (Java 17) and **React 18**.

---

## Features

| Module | Capabilities |
|---|---|
| **Auth** | JWT login, registration, RBAC (ADMIN / MANAGER / SME / TESTER / VIEWER) |
| **Projects** | Multi-project support with soft-delete |
| **Test Cases** | CRUD with ordered steps, code auto-generation (TC-001…) |
| **Workflow** | DRAFT → PENDING_SME_REVIEW → SME_APPROVED → ASSIGNED → IN_PROGRESS → PASSED → SIGNED_OFF |
| **SME Review** | Queue view, inline edit, bulk approve, request-changes with comment |
| **Manager** | Bulk assign to testers, due-date tracking |
| **Excel Import** | Bulk import up to 500 rows, template download, per-row error report |
| **Defects** | Severity/priority tracking, Jira key field, status transitions |
| **Dashboard** | Real-time KPIs, bar & pie charts, pipeline swimlane |
| **Sign-Off** | SME signs off PASSED cases → SIGNED_OFF, exports notes |
| **OpenAPI** | Swagger UI at `/swagger-ui.html` |

---

## Architecture

```
test-management-tool/
├── backend/                        # Spring Boot 3.2 (Java 17)
│   └── src/main/java/com/testmgmt/
│       ├── config/                 # Security, OpenAPI, DataInitializer
│       ├── controller/             # REST controllers
│       ├── dto/                    # Request & Response DTOs
│       ├── entity/                 # JPA entities (UUID PKs, auditing)
│       ├── enums/                  # Status, Priority, Role enums
│       ├── exception/              # Global exception handler
│       ├── repository/             # Spring Data JPA repositories
│       ├── security/               # JWT filter, UserDetailsService
│       └── service/                # Business logic
├── frontend/                       # React 18 SPA
│   └── src/
│       ├── api/index.js            # Axios API client
│       ├── hooks/useAuth.js        # Auth context
│       ├── components/Layout.*     # Sidebar layout + global CSS
│       └── pages/                  # Dashboard, TestCases, Workflow, etc.
└── docker-compose.yml              # Postgres + App + Frontend
```

---

## Quick Start

### Option 1 — Docker (recommended)

```bash
# Clone the project
git clone <repo-url>
cd test-management-tool

# Start everything
docker-compose up --build

# Access the app
open http://localhost:3000          # React frontend
open http://localhost:8080/swagger-ui.html  # API docs
```

### Option 2 — Local development

**Prerequisites:** Java 17+, Maven 3.9+, Node 20+, PostgreSQL 15+

```bash
# 1. Start Postgres
docker run -d --name pg \
  -e POSTGRES_DB=testmgmt \
  -e POSTGRES_USER=testmgmt \
  -e POSTGRES_PASSWORD=testmgmt123 \
  -p 5432:5432 postgres:15-alpine

# 2. Run backend
cd backend
mvn spring-boot:run

# 3. Run frontend (new terminal)
cd frontend
npm install
npm start
```

---

## Seeded Users

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@testmgmt.io` | `Admin@1234` |
| MANAGER | `manager@testmgmt.io` | `Manager@1234` |
| SME | `sme@testmgmt.io` | `Sme@1234` |
| TESTER | `tester@testmgmt.io` | `Tester@1234` |

---

## Key API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/register` | Register (TESTER role) |
| POST | `/api/v1/auth/change-password` | Change own password |

### Test Cases
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/testcases?projectId=&status=&page=` | List (paginated) |
| POST | `/api/v1/testcases` | Create with steps |
| PUT | `/api/v1/testcases/{id}` | Update |
| DELETE | `/api/v1/testcases/{id}` | Delete |
| PATCH | `/api/v1/testcases/{id}/forward-sme` | MANAGER: forward to SME |
| GET | `/api/v1/testcases/sme-queue` | SME: pending queue |
| PUT | `/api/v1/testcases/{id}/sme-review` | SME: edit + note |
| POST | `/api/v1/testcases/bulk-approve` | SME: bulk approve |
| POST | `/api/v1/testcases/{id}/request-changes` | SME: reject + comment |
| POST | `/api/v1/testcases/assign` | MANAGER: assign to tester |
| POST | `/api/v1/testcases/signoff/{projectId}` | SME: sign off PASSED cases |
| POST | `/api/v1/testcases/import?projectId=` | Import Excel (.xlsx) |
| GET | `/api/v1/testcases/import/template` | Download Excel template |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/reports/manager-dashboard?projectId=` | Single project KPIs |
| GET | `/api/v1/reports/manager-dashboard/all` | All projects KPIs |

---

## Excel Import Format

Download the template from the app or via:
```
GET /api/v1/testcases/import/template
```

| Column | Required | Notes |
|---|---|---|
| `product_module` | ✅ | Module name (created if not exists) |
| `test_case_title` | ✅ | Unique within project |
| `description` | — | Free text |
| `preconditions` | — | Free text |
| `priority` | ✅ | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| `step_number` | ✅ | Integer ≥ 1 |
| `step_action` | ✅ | What to do |
| `expected_result` | ✅ | What should happen |

Multiple rows with the same title add steps to the same test case.

---

## Role Permissions

| Action | ADMIN | MANAGER | SME | TESTER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| Create test case | ✅ | ✅ | — | ✅ | — |
| Forward to SME | ✅ | ✅ | — | — | — |
| SME review queue | — | — | ✅ | — | — |
| Bulk approve | — | — | ✅ | — | — |
| Request changes | — | — | ✅ | — | — |
| Assign to tester | ✅ | ✅ | — | — | — |
| Sign off | — | — | ✅ | — | — |
| Import Excel | ✅ | ✅ | — | ✅ | — |
| Manager dashboard | ✅ | ✅ | — | — | — |
| Manage users | ✅ | — | — | — | — |

---

## Running Tests

```bash
cd backend
mvn test
```

Tests use H2 in-memory database (profile `test`). Integration tests cover:
- Auth register/login flow
- Invalid credentials return 401
- Validation errors return 400

---

## Technology Stack

**Backend**
- Spring Boot 3.2, Spring Security 6, Spring Data JPA
- PostgreSQL 15 (H2 for tests)
- JWT (jjwt 0.12)
- Apache POI (Excel)
- SpringDoc OpenAPI 2 (Swagger UI)
- Lombok, MapStruct
- Maven

**Frontend**
- React 18, React Router v6
- Axios
- Recharts (charts)
- Lucide React (icons)
- Pure CSS (no Tailwind — custom dark theme)

**Infrastructure**
- Docker / Docker Compose
- Nginx (frontend SPA serving + API reverse proxy)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/testmgmt` | DB URL |
| `SPRING_DATASOURCE_USERNAME` | `testmgmt` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `testmgmt123` | DB password |
| `APP_JWT_SECRET` | (64-char hex) | JWT signing key |
| `APP_JWT_EXPIRATION` | `86400000` | Token TTL (ms) — 24h |
| `JIRA_BASE_URL` | `https://your-domain.atlassian.net` | Jira integration URL |
| `JIRA_API_TOKEN` | — | Jira API token |
