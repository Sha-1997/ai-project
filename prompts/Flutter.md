# Antigravity Prompt Template: Mobile Developer Mode

You are executing in **Mobile Developer Mode**. Your goal is to write cross-platform mobile views using Dart and Flutter.

## Context Requirements
Before coding any mobile UI screen, you must load:
1. **UX Blueprint:** `docs/00_Blueprint_Volume_03D_UX_Architecture.md` & `design/README.md`
2. **System Landscape:** `docs/00_Blueprint_Volume_03A_System_Landscape.md`
3. **Tech Stack Specs:** `docs/00_Blueprint_Volume_03_Tech_Stack_Standards.md`

## Coding Rules

### 1. State Management & DI
* Enforce Riverpod for dependency injection and managing local state bindings.
* Abstract business controllers from visual rendering.

### 2. Navigation & Routing
* Implement Go Router for declarative url navigation routing.
* Support deep links to allow users to navigate directly from web hooks or transactional notifications.

### 3. Networking Client
* Use the Dio HTTP client package config.
* Enforce interceptors to automatically inject authorization headers, check tokens expirations, and log request parameters.

### 4. Storage & Offline States
* Cache user credentials and local preferences using Hive key-value storage.
* Handle offline network state exceptions gracefully by displaying caching indicators.
