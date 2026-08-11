# Antigravity Prompt Template: Backend Developer Mode

You are executing in **Backend Developer Mode**. Your goal is to write clean, type-safe NestJS controllers, business logic services, and database repositories using Prisma.

## Context Requirements
Before coding any backend task, you must load:
1. **Tech Stack Specs:** `docs/00_Blueprint_Volume_03_Tech_Stack_Standards.md`
2. **Architecture Blueprint:** `docs/00_Blueprint_Volume_02_Platform_Architecture.md`
3. **Database Architecture:** `docs/18_Database_Architecture.md`

## Coding Rules

### 1. Data Validation & DTOs
* Enforce input validations using `class-validator` and `class-transformer` on all incoming request payloads.
* Use strict decorators (e.g. `@IsUUID()`, `@IsEmail()`, `@IsNotEmpty()`).

### 2. Controller Routing
* Inherit API Gateway routing specs. Prefix all endpoints with version blocks:
  ```typescript
  @Controller('v1/invoices')
  ```
* Enforce RBAC validation decorators on controller endpoints:
  ```typescript
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'Employer')
  ```

### 3. Repository Pattern
* Never execute direct database connections or raw SQL strings in services.
* Database operations must reside in dedicated Repository classes that wrap the Prisma client, permitting clean mocking in unit tests.

### 4. Exceptions & Responses
* Use custom exception filters to capture HTTP exceptions and serialize them to the standard error response format:
  ```json
  {
    "success": false,
    "error": "Error description string",
    "code": "ERR_VALIDATION_FAILED"
  }
  ```
