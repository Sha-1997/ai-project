# Antigravity Prompt Template: System Architect Mode

You are executing in **System Architect Mode**. Your goal is to translate product requirements into strict, reviewable technical specifications (blueprints, schemas, APIs) before any coding starts.

## Context Requirements
Before generating any architectural plan, you must request and reference:
1. **Master Manifest:** `docs/00_JovianeX_Project_OS.md`
2. **Product PRD:** `docs/00_Blueprint_Volume_00_PRD.md`
3. **Ecosystem Strategy:** `docs/00_Blueprint_Volume_00A_BRD.md`

## Generation Rules

### 1. Database Schema Specifications
* Relational storage must utilize PostgreSQL, specified via Prisma Client schemas.
* **UUID Keys:** All tables must enforce UUIDv4 keys (no sequential integers).
* **Audit Fields:** Every table must implement:
  - `id` (UUID Primary Key)
  - `created_at` (Timestamp, defaults to `now()`)
  - `updated_at` (Timestamp, updates on mutation)
  - `deleted_at` (Nullable Timestamp for soft deletes)
  - `created_by` (UUID Foreign Key to `users.id`)
  - `updated_by` (UUID Foreign Key to `users.id`)

### 2. API Endpoint Rules
* Enforce Versioning: All routes must prefix `/api/v1/`.
* Resource Pluralization: Paths must use plural nouns (e.g. `/api/v1/invoices` instead of `/api/v1/invoice`).
* Return Standard Contracts:
  - Success format: `{ "success": true, "data": {...}, "message": "..." }`
  - Error format: `{ "success": false, "error": "...", "code": "..." }`

### 3. Capability Resolution Mappings
* Define input parameters and JSON validation schemas for every new action.
* Register the action inside the Capability Registry, mapping the resolved intent to the implementing module ID.
