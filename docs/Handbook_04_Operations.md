# 📘 Handbook 04 – Operations

**Version:** 1.0  
**Owner:** DevOps / SRE / QA Lead  
**Scope:** Governance, Security, Deployment, SRE telemetry, and ADR summaries  

---

## 5.1 Team & Code Governance

### Decision-Making Chain
Product vision originates from the **Founder**, mapped into architecture bounds by the **Chief Architect**, scheduled into task tickets by the **Project Manager**, and peer-reviewed by **Tech Leads** before developers commit codes.

### Git Branching Strategy
* `main` ──► Protected. Production logs.
* `develop` ──► Integration. Merges feature branches.
* `release/*` ──► Staging checks validation.
* `feature/TASK-ID` ──► Developer task sandbox.
* `hotfix/*` ──► Fast fix redirects to main/develop.

---

## 5.2 Release & Deployment Pipelines

Deployments follow a zero-bypass progression pipeline:
`Development ──► Automated CI Test Suites ──► Staging Server ──► Production Container`

* **Staging Verification Checklist:**
  - Database schema migrations apply cleanly.
  - SRE readiness `/health` endpoint resolves 200 OK.
  - Integration checks verify Redis session parameters can be parsed.

---

## 5.3 Security defaults

- **Secrets Policy:** Credentials, Stripe keys, and JWT salts are loaded at runtime from environment variables. Direct hardcoding in code commits triggers compile security failures.
- **Access Control:** APIs enforce CORS origin whitelists. Global input whitelisting trims parameters (ValidationPipe) to mitigate SQL/no-SQL injection vulnerabilities.
- **Passwords Policy:** Stored passwords must be salted and hashed using Bcrypt (minimum 10 rounds strength).

---

## 5.4 SRE Monitoring & Diagnostics

- **Structured Logging:** Console output uses JSON formatting including Request correlation IDs for trace mapping.
- **Liveness & Readiness Probes:**
  - Route `GET /sre/health` tests database raw query connection speed.
  - Route `GET /sre/telemetry` compiles hardware metrics and table records statistics counts.
- **SRE Gate Security:** Scrape queries are blocked (HTTP 403 Forbidden) unless request contains token header `x-sre-key: jovianex-sre-key-2026`.

---

## 5.5 Program Management Registry

### RACI Matrix
* **PRD & Roadmap:** Founder (A), PM (R), Architect (C).
* **Code & APIs:** Backend Dev (R), Web Dev (R), Architect (A).
* **Test cases:** QA Engineer (R), Tech Lead (A).
* **Deployment:** DevOps (R), SRE (A).

### Authentication WBS (PM-AUTH-001)

| Task ID | Epic Focus | Deliverable | Assigned To |
| :--- | :--- | :--- | :--- |
| **AUTH-DB-001** | Database | Create Users Table | Backend Developer |
| **AUTH-DB-002** | Database | Create User Profiles Table | Backend Developer |
| **AUTH-DB-003** | Database | Create Roles Table | Backend Developer |
| **AUTH-DB-004** | Database | Create Permissions Table | Backend Developer |
| **AUTH-DB-005** | Database | Create Sessions Table | Backend Developer |
| **AUTH-DB-006** | Database | Create Devices Table | Backend Developer |
| **AUTH-DB-007** | Database | Create OTP Table | Backend Developer |
| **AUTH-DB-008** | Database | Create Refresh Token Table | Backend Developer |
| **AUTH-BE-001** | Backend API | Register API Endpoint | Backend Developer |
| **AUTH-BE-002** | Backend API | Login API Endpoint | Backend Developer |
| **AUTH-BE-003** | Backend API | Logout API Endpoint | Backend Developer |
| **AUTH-BE-004** | Backend API | Refresh Token API | Backend Developer |
| **AUTH-BE-005** | Backend API | Forgot Password Routing | Backend Developer |
| **AUTH-BE-006** | Backend API | Reset Password Routing | Backend Developer |
| **AUTH-BE-007** | Backend API | JWT Authentication Middleware | Backend Developer |
| **AUTH-BE-008** | Backend API | Role & Permission Guard checks | Backend Developer |
| **AUTH-WEB-001**| Website | Login Page interface | Web Developer |
| **AUTH-WEB-002**| Website | Register Page interface | Web Developer |
| **AUTH-WEB-003**| Website | OTP Validation Screen | Web Developer |
| **AUTH-WEB-004**| Website | Forgot Password Page | Web Developer |
| **AUTH-WEB-005**| Website | Reset Password Page | Web Developer |
| **AUTH-WEB-006**| Website | User Profile Dashboard | Web Developer |
| **AUTH-WEB-007**| Website | Security & Devices Management | Web Developer |
| **AUTH-QA-001** | QA | Registration Test Cases | QA Engineer |
| **AUTH-QA-002** | QA | Login Test Cases | QA Engineer |
| **AUTH-QA-003** | QA | OTP verification Test Cases | QA Engineer |
| **AUTH-QA-004** | QA | Session expiry checks | QA Engineer |
| **AUTH-QA-005** | QA | Devices logs checks | QA Engineer |
| **AUTH-QA-006** | QA | Security filters validation | QA Engineer |


### RAID Log Checkpoints
* **Risk (R-01):** Windows relative path compiler resolution failures inside Nest CLI.
  - *Mitigation:* direct typescript compilation bypassing Nest CLI paths mappings using direct `tsc` config compile tags.
* **Assumption (A-01):** Local PostgreSQL runs on port 5432, local Redis runs on port 6379.
* **Dependency (D-01):** Stripe payment status triggers subscription status updates. Stripe webhook listeners must confirm raw signature hashes.

---

## 5.6 Architecture Decision Records (ADRs) Summaries

* **ADR-001 (Monolith):** Adopt Modular Monolith architecture to minimize initial microservices overhead.
* **ADR-002 (Mobile):** Use Flutter as the mobile platform for cross-platform visual consistency.
* **ADR-003 (Web):** Use Next.js React framework with App Router layout for SSR and SEO.
* **ADR-004 (Backend):** Use NestJS to enforce strict dependency injection modular architectures.
* **ADR-005 (TypeScript):** Deploy TypeScript globally across all workspaces for type safety.
* **ADR-006 (PostgreSQL):** Adopt PostgreSQL 15-alpine as the primary SQL engine.
* **ADR-007 (Redis):** Use Redis 7-alpine for transient session caches and OTP codes.
* **ADR-008 (S3 Storage):** AWS S3-compatible storage handles static candidate profiles assets.
* **ADR-009 (Auth):** Standardize stateless JWT access tokens + DB-backed refresh tokens.
* **ADR-010 (Monorepo):** Maintain code files inside a single monorepo using npm workspaces.
* **ADR-011 (Design):** Establish unified brand color tokens Slate/Emerald/Grey.
* **ADR-012 (AI Strategy):** Design AI as a foundational platform layer, not a separate module.
* **ADR-013 (Capability Registry):** Map intents to standardized capability strings.
* **ADR-014 (Module Registry):** Control module registrations profiles.
* **ADR-015 (Workflow Engine):** Centralize multi-module state changes rules.
* **ADR-016 (API Design):** Standardize REST endpoint JSON payloads.
* **ADR-017 (UI Strategy):** Build responsive desktop Web layouts alongside native Mobile Flutter apps.
* **ADR-018 (Doc First):** Do not write code features before PRD/blueprint approvals.
* **ADR-019 (API First):** Finalize Swagger endpoint parameters specs before frontend UI builds.
* **ADR-020 (Security Defaults):** Enforce secure headers, HttpOnly cookies, and whitelisted inputs.
* **ADR-021 (Docker):** Standardize container orchestrations for all environments.
* **ADR-022 (Monitoring):** Instrument backend with OpenTelemetry.
* **ADR-023 (JSON Logging):** Expose structured JSON logs for external parsers.
* **ADR-024 (Notifications):** Queue SMS/Email templates under a single dedicated dispatcher service.
* **ADR-025 (Unified Search):** Search profiles database tables using integrated full-text index queries.
* **ADR-026 (Module Design):** Enforce consistent folders templates controller/service/entity.
* **ADR-027 (SemVer):** Apply SemVer versioning rules (MAJOR.MINOR.PATCH) to releases.
* **ADR-028 (Feature Flags):** Toggle draft features visibility using dynamic database settings.
* **ADR-029 (LLM Abstraction):** Wrap model calls in abstract providers to avoid vendor lock-ins.
* **ADR-030 (Pipelines Staged):** Prohibit direct master pushes to production without QA/Staging validation.

---

## 5.7 Sprint 1 – Platform Foundation (SPRINT-01)

* **Duration:** 5 Working Days  
* **Priority:** Critical (P0)  
* **Objective:** Establish the stable engineering, monorepo workspaces, and Docker operations framework.

### Sprint 1 Deliverables
* **Repository & Workspaces:** Monorepo config (`CORE-002`) and repository init (`CORE-001`).
* **Backend API Setup:** NestJS boots (`CORE-003`, `CORE-004`) and health queries (`CORE-005`).
* **Database & Cache:** Postgres connections (`CORE-006`) and Redis connections (`CORE-007`).
* **Web Setup:** Next.js setups (`WEB-001`, `WEB-002`, `WEB-003`).
* **Mobile Setup:** Flutter config (`MOB-001`, `MOB-002`, `MOB-003`).
* **Shared Packages:** Common types libraries (`CORE-008`, `CORE-009`).
* **Infrastructure & CI:** Docker environments (`DEVOPS-001`, `DEVOPS-002`) and CI actions (`DEVOPS-003`).

---

## 5.8 Sprint 2 – Authentication MVP (SPRINT-02)

* **Duration:** 10 Working Days  
* **Priority:** P0 (Critical)  
* **Objective:** Enable users to register accounts, log in, sign tokens, manage active user sessions, and access gated resources.

### Sprint 2 Deliverables
* **User Identity & Database:** Create and configure users and profiles models mappings (`AUTH-001`).
* **SSO Registration API:** OTP validations endpoints (`AUTH-002`, `AUTH-003`).
* **SSO Login API:** Dynamic access and refresh JWT token generation routes (`AUTH-004`, `AUTH-005`, `AUTH-006`).
* **Profile Services:** Get and patch profile details (`AUTH-007`, `AUTH-008`).
* **Security & Guards:** Hashing validation (`AUTH-009`), JWT session validation checks (`AUTH-010`), and role scopes mappings (`AUTH-011`).
* **Website Pages:** Next.js Login, Register, Forgot Password, and Profile pages (`AUTH-WEB-001` through `AUTH-WEB-004`).
* **Mobile Screens:** Flutter Splash, Login, Register, and Profile UI screens (`AUTH-MOB-001` through `AUTH-MOB-004`).
* **QA Test cases:** Automated tests checks for registrations, logins, logouts, and token verification (`AUTH-QA-001` through `AUTH-QA-004`).

---

## 5.9 Sprint 3 – Identity & Membership (SPRINT-03)

* **Duration:** 10 Working Days  
* **Priority:** P0 (Critical)  
* **Objective:** Establish the Identity Platform (RBAC permissions framework), active session/device controls, membership configurations, and dynamic subscriptions.

### Sprint 3 Deliverables
* **Identity & Middleware:** Core roles, custom permissions arrays, role assignments, and permission validation checks middleware (`ID-001` through `ID-004`).
* **Session Management:** Listing active sessions, revoking single or all sessions, and session validation expiry parameters (`ID-005` through `ID-008`).
* **Device Management:** Trusted devices logs and device revocation processes (`ID-009`, `ID-010`, `ID-011`).
* **Membership Plans:** Configure billing plans limits (`MEM-001`, `MEM-002`) and upgrade/downgrade membership operations (`MEM-003`, `MEM-004`, `MEM-005`).
* **Subscriptions Lifecycle:** Subscription states mapping and automated billing history records (`MEM-006`, `MEM-007`, `MEM-008`).
* **User Preferences:** Configure locale preferences, custom light/dark theme choices, notification settings, and privacy permissions options (`USER-001` through `USER-004`).
* **Website Pages:** Membership, Subscription, Security Center, Device Manager, and Preferences dashboard panels pages (`MEM-WEB-001` through `MEM-WEB-005`).
* **Mobile Screens:** Membership, Subscription, Device Manager, and settings layouts (`MEM-MOB-001` through `MEM-MOB-004`).

---

## 5.10 Sprint 4 – AI Foundation (SPRINT-04)

* **Duration:** 10 Working Days  
* **Priority:** P0 (Critical)  
* **Objective:** Deploy the core AI Platform framework, LLM provider abstraction adapters, context caching stores, capability registry intent routes, and security limits.

### Sprint 4 Deliverables
* **AI Gateway:** Establish standard request routing gateways and provider abstractions for OpenAI, Gemini, and Anthropic (`AI-001`, `AI-002`, `AI-003`).
* **Conversations Logs:** CRUD endpoints for saving, listing, and deleting conversations message logs (`AI-004` through `AI-007`).
* **AI Memory Store:** Caching context properties and updating conversational session memories (`AI-008`, `AI-009`, `AI-010`).
* **Capability Registry:** Map keywords to registry capability codes and routing commands payload structures (`AI-011`, `AI-012`, `AI-013`).
* **Prompt Engine:** Configure system prompt loaders, templates, and runtime parameters variables (`AI-014`, `AI-015`, `AI-016`).
* **Website Pages:** AI Chat overlay interface, conversations list sidebar, prompt triggers input, and markdown response components (`AI-WEB-001` through `AI-WEB-004`).
* **Mobile Screens:** Native AI Chat layouts and voice commands placeholder hooks (`AI-MOB-001` through `AI-MOB-004`).
* **AI Security:** Prompt logging limits, auditing, and subscription level usage check filters (`AI-SEC-001`, `AI-SEC-002`, `AI-SEC-003`).

---

## 5.11 Sprint 5 – Dashboard & Core Services (SPRINT-05)

* **Duration:** 10 Working Days  
* **Priority:** P0 (Critical)  
* **Objective:** Establish the personalized dashboard platform shell containing widgets adapters, module launchers, global search routing, and notification hubs.

### Sprint 5 Deliverables
* **Dashboard layout:** Responsive 4-pane layouts supporting Header, Sidebar, Content panels, and Footer (`DASH-001`, `DASH-002`).
* **Dynamic Widgets:** Welcome boxes, quick action buttons lists, activity trackers, and pinned favorite items (`DASH-003` through `DASH-006`).
* **AI Assistant integration:** Dashboard inline mini chat boxes and recommended action prompts (`DASH-007`, `DASH-008`).
* **Notifications Hub:** Unread indicators, categorized message filters, and real-time counter updates (`CORE-001`, `CORE-002`, `CORE-003`).
* **Universal Search:** Multi-entity global text queries API routing and search index results lists (`CORE-004`, `CORE-005`).
* **Module Launcher:** Dynamic cards grids mapping registered capability modules (`CORE-006`, `CORE-007`).
* **Mobile Layouts:** Native bottom navigation bar, home summaries dashboard widgets (`DASH-MOB-001` through `DASH-MOB-004`).
* **QA Test cases:** Automated tests checking search bars, launchers loading, notifications counts, and mobile viewports (`DASH-QA-001` through `DASH-QA-003`).

