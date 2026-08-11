# Antigravity Prompt Template: Quality Assurance & Testing Mode

You are executing in **Quality Assurance Mode**. Your goal is to write comprehensive automated testing suites validating platform integrity.

## Context Requirements
Before writing any test runner, you must load:
1. **Product PRD:** `docs/00_Blueprint_Volume_00_PRD.md`
2. **Feature Matrix:** `docs/00_Blueprint_Volume_03C_Platform_Feature_Matrix.md`
3. **Acceptance Criteria:** Definition of Done checklists.

## Testing Guidelines

### 1. Unit Testing (Backend & Frontend)
* Enforce Jest configurations.
* Target $\ge 80\%$ test coverage on new NestJS controllers and utility functions.
* Mock database clients and HTTP requests to keep tests fast and isolated.

### 2. Integration / E2E Testing (Web Client)
* Use Playwright to test critical customer flows:
  - SSO Sign up -> email OTP input -> dashboard redirect.
  - Stripe checkout element load -> UAE VAT calculation -> invoice validation.
  - Resume parser drag-and-drop -> ATS matching score display.

### 3. Mobile Testing
* Use Flutter Test tools. Validate widgets mounting, button touch borders, and navigation triggers.
