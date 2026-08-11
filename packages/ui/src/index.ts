// JOVIANEX AI ECOSYSTEM - SHARED FRONTEND DESIGN SYSTEM & STATE MANAGEMENT (v1.0)

// 1. SHARED DESIGN SYSTEM TOKENS (CURATED Sleek HSL COLOR PALETTES)
export const DesignSystem = {
  colors: {
    primary: "hsl(222.2, 84%, 4.9%)",       // Dark Slate Core
    secondary: "hsl(210, 40%, 96.1%)",      // Soft Gray Accent
    accent: "hsl(142.1, 70.6%, 45.3%)",     // Vibrant emerald green (KYC Verified indicator)
    destructive: "hsl(0, 84.2%, 60.2%)",    // Dark crimson (Rejected/Critical tags)
    background: "hsl(0, 0%, 100%)",         // Standard layout background
    backgroundDark: "hsl(222.2, 84%, 4.9%)",// Dark mode base background
    border: "hsl(214.3, 31.8%, 91.4%)",
    textPrimary: "hsl(222.2, 84%, 4.9%)",
    textSecondary: "hsl(215.4, 16.3%, 46.9%)",
  },
  typography: {
    fontFamily: "'Outfit', 'Inter', sans-serif",
    sizes: {
      hero: "3.5rem",
      title: "2rem",
      body: "1rem",
      caption: "0.85rem",
    },
    weights: {
      regular: "400",
      medium: "500",
      bold: "700",
    }
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  }
};

// 2. STATE MANAGEMENT PATTERNS (PM RECOMMENDATIONS: STANDARDIZE ACROSS PORTALS)

// A. AUTHENTICATION STATE
export class AuthState {
  private static instance: AuthState;
  public loggedIn: boolean = false;
  public token: string | null = null;
  public userDetails: { id: string; email: string; role: string } | null = null;

  private constructor() {}

  public static getInstance(): AuthState {
    if (!AuthState.instance) {
      AuthState.instance = new AuthState();
    }
    return AuthState.instance;
  }

  public login(token: string, user: { id: string; email: string; role: string }): void {
    this.loggedIn = true;
    this.token = token;
    this.userDetails = user;
    console.log(`[AuthState] Logged in as: ${user.email} (${user.role})`);
  }

  public logout(): void {
    this.loggedIn = false;
    this.token = null;
    this.userDetails = null;
    console.log("[AuthState] Logged out successfully.");
  }
}

// B. USER PROFILE STATE
export class ProfileState {
  private static instance: ProfileState;
  public completenessScore: number = 0;
  public skills: string[] = [];
  public experiences: any[] = [];
  public activeResumeId: string | null = null;

  private constructor() {}

  public static getInstance(): ProfileState {
    if (!ProfileState.instance) {
      ProfileState.instance = new ProfileState();
    }
    return ProfileState.instance;
  }

  public updateProfile(data: { score: number; skills: string[]; experiences: any[]; resumeId: string | null }): void {
    this.completenessScore = data.score;
    this.skills = data.skills;
    this.experiences = data.experiences;
    this.activeResumeId = data.resumeId;
    console.log(`[ProfileState] Updated profile details. Completeness at ${this.completenessScore}%`);
  }
}

// C. NOTIFICATION STATE
export interface AppNotification {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationState {
  private static instance: NotificationState;
  public unreadCount: number = 0;
  public alerts: AppNotification[] = [];

  private constructor() {}

  public static getInstance(): NotificationState {
    if (!NotificationState.instance) {
      NotificationState.instance = new NotificationState();
    }
    return NotificationState.instance;
  }

  public setAlerts(list: AppNotification[]): void {
    this.alerts = list;
    this.unreadCount = list.filter((n) => !n.isRead).length;
    console.log(`[NotificationState] Loaded ${list.length} alerts. Unread: ${this.unreadCount}`);
  }

  public markAllAsRead(): void {
    this.alerts = this.alerts.map((n) => ({ ...n, isRead: true }));
    this.unreadCount = 0;
    console.log("[NotificationState] All notifications marked as read.");
  }
}

// D. SEARCH STATE
export class SearchState {
  private static instance: SearchState;
  public query: string = "";
  public categoryId: string | null = null;
  public activeFilters: Record<string, any> = {};

  private constructor() {}

  public static getInstance(): SearchState {
    if (!SearchState.instance) {
      SearchState.instance = new SearchState();
    }
    return SearchState.instance;
  }

  public updateSearch(query: string, categoryId: string | null, filters: Record<string, any>): void {
    this.query = query;
    this.categoryId = categoryId;
    this.activeFilters = filters;
    console.log(`[SearchState] Filter updated. Query: "${query}". Filters:`, filters);
  }
}

// E. THEME STATE
export class ThemeState {
  private static instance: ThemeState;
  public currentMode: "LIGHT" | "DARK" = "LIGHT";

  private constructor() {}

  public static getInstance(): ThemeState {
    if (!ThemeState.instance) {
      ThemeState.instance = new ThemeState();
    }
    return ThemeState.instance;
  }

  public toggleMode(): void {
    this.currentMode = this.currentMode === "LIGHT" ? "DARK" : "LIGHT";
    console.log(`[ThemeState] Theme toggled to: ${this.currentMode}`);
  }
}
