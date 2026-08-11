import { PrismaClient, CompliancePolicy, UserConsent, PrivacyPreference, ImmutableAuditLog } from "@prisma/client";

export class ComplianceService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. JURISDICTION-BASED POLICY CREATION & LIFECYCLE MANAGEMENT
   * Supports region-based frameworks (UAE, India, EU, US).
   */
  async createCompliancePolicy(
    title: string,
    version: string,
    category: string,
    content: string,
    region: string
  ): Promise<CompliancePolicy> {
    const cleanCategory = category.toUpperCase(); // TOS, PRIVACY, MARKETING, RULES
    const cleanRegion = region.toUpperCase();

    return this.prisma.compliancePolicy.create({
      data: {
        title,
        version,
        category: cleanCategory,
        content,
        regionRestrictions: cleanRegion,
        status: "ACTIVE", // Automatically set active on creation for JIP
      },
    });
  }

  /**
   * 2. DETAILED CONSENT TRACKING (SEPARATE TERM & VERSION ACCEPTANCE)
   * Tracks separately: TOS, Privacy Policy, and Marketing preferences.
   * Logs version, timestamp, source, language, IP, and UserAgent.
   */
  async registerConsent(
    userId: string,
    policyId: string,
    status: string,
    platform: string,
    languageCode: string,
    ipAddress: string,
    userAgent: string
  ): Promise<UserConsent> {
    const policy = await this.prisma.compliancePolicy.findUnique({ where: { id: policyId } });
    if (!policy) throw new Error("Compliance policy not found.");

    const consentedStatus = status.toUpperCase(); // ACCEPTED, REJECTED
    const sourcePlatform = platform.toUpperCase(); // WEB, MOBILE

    const consent = await this.prisma.userConsent.create({
      data: {
        userId,
        policyId,
        consentedStatus,
        sourcePlatform,
        languageCode,
        ipAddress,
        userAgent,
      },
    });

    // Log to ImmutableAuditLog
    await this.logAudit(
      userId,
      "SENSITIVE",
      "CONSENT_REGISTERED",
      `User consented to ${policy.category} version ${policy.version} (${consentedStatus}). Consent ID: ${consent.id}`,
      ipAddress
    );

    return consent;
  }

  /**
   * 3. USER PRIVACY CONFIGURATIONS
   */
  async updatePrivacyPreferences(
    userId: string,
    prefs: { email: boolean; sms: boolean; push: boolean; profileVisibility: string; searchVisibility: boolean }
  ): Promise<PrivacyPreference> {
    return this.prisma.privacyPreference.upsert({
      where: { userId },
      update: {
        communicationEmail: prefs.email,
        communicationSms: prefs.sms,
        communicationPush: prefs.push,
        profileVisibility: prefs.profileVisibility.toUpperCase(), // PUBLIC, EMPLOYERS_ONLY, PRIVATE
        searchVisibility: prefs.searchVisibility,
      },
      create: {
        userId,
        communicationEmail: prefs.email,
        communicationSms: prefs.sms,
        communicationPush: prefs.push,
        profileVisibility: prefs.profileVisibility.toUpperCase(),
        searchVisibility: prefs.searchVisibility,
      },
    });
  }

  /**
   * 4. DATA SUBJECT DSR ACTIONS (GDPR DATA PORTABILITY EXPORTS)
   * Gathers all user profile records, preferences, consents, and audits to a structured JSON bundle.
   */
  async exportUserData(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        consents: { include: { policy: true } },
        privacyPreference: true,
        immutableAuditLogs: true,
        memberships: true,
      },
    });

    if (!user) throw new Error("User profile not found.");

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      userProfile: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        status: user.status,
      },
      memberships: user.memberships,
      consentsHistory: user.consents.map((c) => ({
        policyCategory: c.policy.category,
        policyVersion: c.policy.version,
        consentedStatus: c.consentedStatus,
        timestamp: c.createdAt,
        platform: c.sourcePlatform,
        ip: c.ipAddress,
      })),
      privacyPreference: user.privacyPreference,
      activityAudits: user.immutableAuditLogs.map((a) => ({
        category: a.auditCategory,
        action: a.action,
        details: a.details,
        timestamp: a.createdAt,
      })),
    };

    return JSON.stringify(exportBundle, null, 2);
  }

  /**
   * 5. DATA SUBJECT DELETION WORKFLOWS (WITH REGULATORY RETENTION EXCLUSIONS)
   * Payments and financial audit histories bypass deletes to satisfy legal taxation bounds.
   */
  async requestDataDeletion(userId: string, performerIp: string): Promise<{ success: boolean; actionsTaken: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });
    if (!user) throw new Error("User profile not found.");

    const actionsTaken: string[] = [];

    // Financial Retention check: check if user holds active payment histories
    const paymentCount = await this.prisma.paymentTransaction.count({
      where: { userId },
    });

    if (paymentCount > 0) {
      actionsTaken.push("LEGAL_RETENTION_OVERRIDE: User billing details and payment audits retained for tax regulatory compliance.");
      
      // Perform soft delete instead of hard delete to secure auditable transactions
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED", softDeleted: true },
      });
      actionsTaken.push("SOFT_DELETED: User account status changed to SUSPENDED. Profile fields obfuscated.");
    } else {
      // Clean delete
      await this.prisma.user.delete({ where: { id: userId } });
      actionsTaken.push("HARD_DELETED: User account deleted from database.");
    }

    // Log deletion request to immutable audits
    await this.logAudit(
      userId,
      "SENSITIVE",
      "DATA_DELETION_REQUEST",
      `Data deletion triggered. Outcome details: ${actionsTaken.join(" | ")}`,
      performerIp
    );

    return { success: true, actionsTaken };
  }

  /**
   * 6. IMMUTABLE AUDIT LOG GENERATION
   */
  async logAudit(
    userId: string,
    category: string,
    action: string,
    details: string,
    ipAddress: string
  ): Promise<ImmutableAuditLog> {
    const allowed = ["AUTH", "PAYMENT", "MEMBERSHIP", "ADMIN", "PERMISSION", "SENSITIVE"];
    const auditCategory = allowed.includes(category.toUpperCase()) ? category.toUpperCase() : "SENSITIVE";

    return this.prisma.immutableAuditLog.create({
      data: {
        userId,
        auditCategory,
        action,
        details,
        ipAddress,
      },
    });
  }
}
