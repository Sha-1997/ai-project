# JovianeX Ecosystem — Session Changelog
**Date:** July 21, 2026  
**Session:** API Server Startup Fix & Seed Configuration

---

## Summary

This session resolved the `npm run start --workspace @jovianex/api` startup failure and configured the database seed with test users.

---

## Files Changed

---

### 1. `apps/api/nest-cli.json`

**What changed:**  
- `entryFile` updated from `"src/main"` to `"main"`

**Why:**  
After fixing the TypeScript compilation root, the compiled output moved from `dist/src/main.js` to `dist/main.js`. The entry file must match the actual output path for NestJS to start the server correctly.

---

### 2. `apps/api/tsconfig.json`

**What changed:**  
- Added `"exclude": ["prisma", "dist", "node_modules"]`

**Why:**  
TypeScript was picking up `prisma/seed.ts` via the default `**/*` include pattern. This caused the compiler to widen the implicit `rootDir` to the workspace root (because `prisma/` sits outside `src/`), which in turn produced wrong output paths like `dist/apps/api/src/main.js` instead of `dist/main.js`.

Excluding `prisma/` keeps all compiled source files under `apps/api/src/` so TypeScript outputs correctly to `dist/main.js`.

---

### 3. `apps/api/src/modules/events/events.service.ts`

**What changed:**  
- Import path changed from:  
  `'../../../../../packages/shared/events/event.types'`  
  to:  
  `'../../common/types/event.types'`

**Why:**  
The deep relative import reached outside `apps/api/` into `packages/shared/`, causing TypeScript to include that external file in the compilation. This pushed the implicit `rootDir` up to the workspace root and broke the output directory structure.

---

### 4. `apps/api/src/modules/analytics/analytics.controller.ts`

**What changed:**  
- Import path changed from:  
  `'../../../../../packages/shared/events/event.types'`  
  to:  
  `'../../common/types/event.types'`

**Why:**  
Same reason as `events.service.ts` above.

---

### 5. `apps/api/src/common/types/event.types.ts` *(new file)*

**What changed:**  
- New file created

**Why:**  
The `EcosystemEvent` type and all related interfaces were copied from `packages/shared/events/event.types.ts` into the API source tree. This removes the external dependency entirely, keeping all source files local to `apps/api/src/` and resolving the compilation root issue.

**Types included:**
- `EventType`
- `BaseEventPayload`
- `UserRegisteredPayload`
- `LoginSuccessfulPayload`
- `MembershipActivatedPayload`
- `PaymentCompletedPayload`
- `JobPublishedPayload`
- `JobViewedPayload`
- `JobAppliedPayload`
- `CandidateShortlistedPayload`
- `EcosystemEvent<T>`

---

### 6. `apps/api/prisma/seed.js`

**What changed:**  
- Added `crypto` module import
- Added `hashPassword()` function using PBKDF2-SHA512 (matches `auth.service.ts` algorithm)
- Added 4 test users with status `ACTIVE`
- Added job categories seed block

**Test users added:**

| Email | Password |
|-------|----------|
| `admin@jovianex.com` | `Admin@1234` |
| `founder@jovianex.com` | `Founder@1234` |
| `candidate@jovianex.com` | `Candidate@1234` |
| `employer@jovianex.com` | `Employer@1234` |

**Job categories added:**  
Technology, Finance, Marketing, Operations, Sales, Human Resources, Design, Legal

**Why:**  
The database had no loginable users. The existing system user had a bcrypt placeholder hash that the PBKDF2-based `auth.service.ts` could not verify. New test users are seeded with properly hashed passwords and `ACTIVE` status so login works immediately without email verification.

---

### 7. `apps/api/package.json`

**What changed:**  
- Added `"prisma": { "seed": "node prisma/seed.js" }` config block

**Why:**  
Prisma requires a `prisma.seed` entry in `package.json` to know which script to execute when running `npx prisma db seed`.

---

### 8. `package.json` (workspace root)

**What changed:**  
- Added `"prisma": { "seed": "node apps/api/prisma/seed.js" }` config block

**Why:**  
When running `npx prisma db seed --schema apps/api/prisma/schema.prisma` from the workspace root, Prisma reads the root `package.json` for the seed command, not the API package one.

---

### 9. `apps/ai-jobs/package.json`

**What changed:**  
- `dev` script changed from `echo 'Run dev for ai-jobs'` to `npx serve . -l 3001`
- `build` script updated from `echo 'Run build for ai-jobs'` to `echo 'No build step required'`

**Why:**  
The app is a standalone HTML file with no framework or build step. `npx serve` serves it as a static file on `http://localhost:3001`.

---

## Commands Reference

```bash
# Start the API server
npm run start --workspace @jovianex/api

# Run database seed
npx prisma db seed --schema apps/api/prisma/schema.prisma

# Start AI Jobs portal
npm run dev --workspace @jovianex/ai-jobs

# Open Prisma Studio
npx prisma studio --schema apps/api/prisma/schema.prisma
```

---

## Root Cause Summary

The core issue was TypeScript's implicit `rootDir` computation. When source files outside `apps/api/src/` were pulled into the compilation (via deep relative imports and the unexcluded `prisma/` folder), TypeScript widened its `rootDir` to the workspace root. This caused all output to mirror the full path — `dist/apps/api/src/main.js` — instead of the expected `dist/main.js`, which `nest start` could not find.

**Fix:** Exclude `prisma/` from compilation and replace external relative imports with a local copy of the shared types.
