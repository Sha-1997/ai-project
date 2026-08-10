# JovianeX AI Platform Ecosystem Monorepo Workspace

Welcome to the **JovianeX AI Ecosystem** monorepo workspace. This repository hosts all operational platforms, portals, shared packages, and databases.

---

## 1. Monorepo Structure

* **`apps/`**: Domain applications (API services, portals).
  - `apps/api/`: NestJS backend server.
  - `apps/web/`: Next.js candidate and employer portals.
  - `apps/admin/`: Vanilla JS operations portal.
* **`packages/`**: Reusable modules.
  - `packages/ui/`: Shared design system.
  - `packages/shared/events/`: Schema-validated event structures.

---

## 2. Getting Started

### Prerequisites
* **Node.js**: v18+ (the workspace has been validated with the current local Node runtime)
* **Docker Desktop**: Required for the PostgreSQL and Redis containers

### Quick Start
1. Install dependencies:
   ```powershell
   npm install
   ```
2. Start the backing services:
   ```powershell
   docker compose up -d
   ```
3. Build the workspace packages:
   ```powershell
   npm run build
   ```
4. Apply Prisma migrations and seed the database:
   ```powershell
   $env:DATABASE_URL='postgresql://postgres:postgrespassword2026@127.0.0.1:5433/jovianex_db?schema=public'
   npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   npx prisma db seed --schema=apps/api/prisma/schema.prisma
   ```
5. Start the API locally:
   ```powershell
   cd apps/api
   npm run start:dev
   ```
6. Open the API at:
   ```text
   http://localhost:3000
   ```
7. Optional: open Prisma Studio:
   ```powershell
   $env:DATABASE_URL='postgresql://postgres:postgrespassword2026@127.0.0.1:5433/jovianex_db?schema=public'
   npx prisma studio --schema=apps/api/prisma/schema.prisma
   ```

### Default Test Accounts
* **Admin**: admin@jovianex.com / Admin@1234
* **Founder**: founder@jovianex.com / Founder@1234
* **Candidate**: candidate@jovianex.com / Candidate@1234
