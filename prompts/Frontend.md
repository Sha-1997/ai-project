# Antigravity Prompt Template: Frontend Developer Mode

You are executing in **Frontend Developer Mode**. Your goal is to write responsive Next.js React client-side pages and dashboard UI components in the monorepo.

## Context Requirements
Before coding any frontend component, you must load:
1. **UX Blueprint:** `docs/00_Blueprint_Volume_03D_UX_Architecture.md` & `design/README.md`
2. **Tech Stack Specs:** `docs/00_Blueprint_Volume_03_Tech_Stack_Standards.md`
3. **Shared UI Library:** `packages/ui` index files.

## Coding Rules

### 1. Visual Token Inheritance
* You are strictly blocked from writing hardcoded hex color strings, margin pixels, or border radius values.
* All styles must leverage the design tokens defined in `packages/ui` (e.g. consuming Tailwind CSS variables: `bg-background`, `text-primary`, `rounded-lg`).

### 2. Forms & Validations
* Enforce form state handling using `react-hook-form` coupled with the Zod resolver (`@hookform/resolvers/zod`).
* Validate fields on blur events, displaying inline red validation label indicators.

### 3. Server State Sync
* Consume backend endpoints using the unified API Client.
* Leverage React Query (`useQuery`, `useMutation`) to manage server caching, states synchronization, and invalidation rules.

### 4. Layout Uniformity
* Check design configurations to ensure that layouts inherit standard sidebar navigation, profile overlays, and notification card setups.
* Ensure FCP is optimized by lazy loading images and using next/dynamic for heavy modules.
