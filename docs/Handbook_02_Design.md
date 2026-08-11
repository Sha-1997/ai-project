# 📘 Handbook 02 – Design

**Version:** 1.0  
**Owner:** UI/UX Design Lead  
**Scope:** Branding Guidelines, Design System, Responsive Grids, and Components specs  

---

## 3.1 Branding & Visual Identity

JovianeX presents a premium, technical aesthetic matching modern AI systems. The interface prioritizes readability, clean borders, and smooth transitions.

* **Primary Typography:**
  - Font Family: `Inter`, `Outfit` (sans-serif fonts loaded from Google Fonts).
  - Default Line Heights: Normal body text uses `1.5`, headings use `1.2`.
* **Dark Mode Preferences:**
  - Dashboards default to a curated slate-gray background to prevent eye strain.

---

## 3.2 Design System Tokens

Visual layout properties utilize standardized token classes to prevent styling drift:

### 🎨 Color Palette

| Token Code | Hex Value | Primary Purpose |
| :--- | :--- | :--- |
| `color-bg-dark` | `#0f172a` | Root dashboard background (Slate 900) |
| `color-bg-card` | `#1e293b` | Card container panels background (Slate 800) |
| `color-primary` | `#10b981` | Brand actions color indicator (Emerald 500) |
| `color-accent` | `#3b82f6` | Secondary links and hints (Blue 500) |
| `color-border` | `#334155` | Borders and dividers (Slate 700) |
| `color-text-bright` | `#f8fafc` | Title labels and primary buttons (Slate 50) |
| `color-text-muted` | `#94a3b8` | Supporting body descriptions (Slate 400) |

---

## 3.3 Typography Hierarchy

| Level | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- |
| `h1` | `2.25rem` | Bold (700) | `1.25` |
| `h2` | `1.75rem` | Semibold (600) | `1.3` |
| `h3` | `1.25rem` | Medium (500) | `1.35` |
| `body` | `1.0rem` | Regular (400) | `1.5` |
| `small`| `0.875rem` | Light (300) | `1.4` |

---

## 3.4 Shared Layout Components

Common components must adhere strictly to these border and spacing constraints:

### 🔘 Button Tokens
* **Padding:** `0.75rem 1.5rem` (normal size).
* **Border Radius:** `0.375rem` (rounded-md).
* **States:** Hover transitions default to `all 0.2s ease-in-out` with subtle opacity scaling.

### 🔲 Card Container Panels
* **Padding:** `1.5rem` (normal size).
* **Border Style:** `1px solid var(--color-border)`.
* **Shadows:** Smooth, low-blur black gradients overlays.

---

## 3.5 Web UI Responsive Guidelines

Web screens are designed mobile-first, scaling dynamically:

* **Grid System:** 12-column responsive layout container.
* **Breakpoints:**
  - `sm`: `640px` (mobile portrait).
  - `md`: `768px` (tablets).
  - `lg`: `1024px` (desktop panels).
  - `xl`: `1280px` (large screens).

---

## 3.6 Mobile UI Custom Spec (Flutter)

* **Cross-Platform UI Alignment:**
  - Flutter widgets map directly to the design system color tokens.
  - Form validation checks error indicators trigger bright crimson overlays (`#ef4444`).
  - Implements canvas transitions matching web layout speeds.
