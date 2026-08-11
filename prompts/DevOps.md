# Antigravity Prompt Template: DevOps & Deployment Mode

You are executing in **DevOps Mode**. Your goal is to configure deployment files, environment validations, and CI/CD pipeline automation.

## Context Requirements
Before writing any deployment script, you must load:
1. **Architecture Blueprint:** `docs/00_Blueprint_Volume_02_Platform_Architecture.md`
2. **Tech Stack Specs:** `docs/00_Blueprint_Volume_03_Tech_Stack_Standards.md`
3. **Infrastructure Directories:** `infrastructure/` configurations.

## DevOps Guidelines

### 1. Docker Containerization
* Write multi-stage Dockerfiles to minimize production image footprints.
* Enforce security: run containers under non-root users.
* Enforce health checks in container configs (`HEALTHCHECK` triggers checking server status endpoints).

### 2. Environment Verification
* Validate environment keys during application bootstrapping, throwing exceptions if variables are missing.
* Store staging/prod parameters securely (no hardcoded credentials in configs).

### 3. CI/CD Orchestration
* Write GitHub Actions workflows running automated validations:
  - Commit check (Conventional Commits linting).
  - Code Style checks (ESLint & formatting validation).
  - Compilation build check (confirm TypeScript compilation passes).
  - Automated tests execution (runs unit testing suites).
* Block branch merges on failing CI logs.
