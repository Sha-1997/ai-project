import { PrismaClient, OperationalCertification, TechnicalDebtItem, LessonsLearnedItem } from "@prisma/client";

export class OperationalReadinessService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. TECHNICAL DEBT REGISTRY LOGS
   */
  async registerTechnicalDebt(
    category: string,
    priority: string,
    title: string,
    description: string,
    targetModule: string,
    ownerId: string
  ): Promise<TechnicalDebtItem> {
    const cleanCategory = category.toUpperCase(); // CODE_QUALITY, SECURITY, PERFORMANCE, ARCHITECTURE
    const cleanPriority = priority.toUpperCase(); // CRITICAL, HIGH, MEDIUM, LOW

    // Pre-check: prevent closure if CRITICAL technical debt is registered without bypass flags
    if (cleanPriority === "CRITICAL") {
      console.warn(`[Readiness Warn] Critical Technical Debt registered: "${title}". Must be resolved before final release.`);
    }

    return this.prisma.technicalDebtItem.create({
      data: {
        category: cleanCategory,
        priority: cleanPriority,
        title,
        description,
        targetModule,
        ownerId,
      },
    });
  }

  /**
   * 2. ORGANIZATIONAL LESSONS LEARNED LOGGER
   */
  async logLessonLearned(
    moduleName: string,
    category: string,
    observation: string,
    impact: string,
    recommendation: string
  ): Promise<LessonsLearnedItem> {
    const cleanCategory = category.toUpperCase(); // TECHNICAL, OPERATIONAL, PRODUCT, RELEASE

    return this.prisma.lessonsLearnedItem.create({
      data: {
        moduleName,
        category: cleanCategory,
        observation,
        impact,
        recommendation,
      },
    });
  }

  /**
   * 3. MANDATORY GOVERNANCE SIGN-OFF ENGINE
   * Enforces explicit approver validations from 8 critical roles:
   *  - Product Manager
   *  - Engineering Manager
   *  - QA Manager
   *  - Security Lead
   *  - DevSecOps Lead
   *  - Operations Manager
   *  - Programme Manager
   *  - Founder / Executive Sponsor
   */
  async executeProgrammeSignOff(
    moduleName: string,
    version: string,
    signedOffByUserId: string,
    comments: string,
    signaturesMap: {
      productManager: boolean;
      engineeringManager: boolean;
      qaManager: boolean;
      securityLead: boolean;
      devsecopsLead: boolean;
      operationsManager: boolean;
      programmeManager: boolean;
      founder: boolean;
    }
  ): Promise<OperationalCertification> {
    console.log(`[Governance] Validating program sign-off signatures for ${moduleName} ${version}...`);

    // Verify all 8 roles are explicitly set to true
    const requiredRoles = [
      "productManager",
      "engineeringManager",
      "qaManager",
      "securityLead",
      "devsecopsLead",
      "operationsManager",
      "programmeManager",
      "founder",
    ];

    for (const role of requiredRoles) {
      if (!signaturesMap[role as keyof typeof signaturesMap]) {
        throw new Error(`Governance Approval Denied: Missing sign-off signature for role "${role}".`);
      }
    }

    // Verify no outstanding CRITICAL technical debt items exist for this module
    const criticalDebtCount = await this.prisma.technicalDebtItem.count({
      where: {
        targetModule: moduleName,
        priority: "CRITICAL",
      },
    });

    if (criticalDebtCount > 0) {
      throw new Error(`Governance Approval Blocked: Found ${criticalDebtCount} unresolved CRITICAL technical debt items.`);
    }

    return this.prisma.operationalCertification.create({
      data: {
        moduleName,
        version,
        status: "APPROVED",
        reviewNotes: `${comments} | Signatures validated: [${requiredRoles.join(", ")}]`,
        signedOffBy: signedOffByUserId,
      },
    });
  }

  /**
   * 4. AI DELIVERY TRANSITION HANDOVER PACKAGE PACKER
   * Lists reusable platform elements, design standards, and shared endpoints.
   */
  async generateHandoverTransitionPackage(sourceModule: string, targetModule: string): Promise<Record<string, any>> {
    console.log(`[Handover] Preparing transition package from ${sourceModule} to ${targetModule}...`);

    // Gathers technical debt items to be resolved in the next phase
    const deferredDebts = await this.prisma.technicalDebtItem.findMany({
      where: { targetModule: sourceModule, priority: { not: "CRITICAL" } },
    });

    return {
      transitionHeader: {
        sourceModule,
        targetModule,
        timestamp: new Date().toISOString(),
        status: "READY",
      },
      reusableCorePlatformServices: [
        "IdentityService (packages/shared/src/identity.service.ts)",
        "PaymentService (packages/shared/src/payment.service.ts)",
        "ObservabilityService (packages/shared/src/observability.service.ts)",
        "DevSecOpsService (packages/shared/src/devsecops.service.ts)",
        "ComplianceService (packages/shared/src/compliance.service.ts)",
        "ResilienceService (packages/shared/src/resilience.service.ts)",
        "PerformanceService (packages/shared/src/performance.service.ts)",
      ],
      sharedApiGatewayEndpoints: [
        "/api/v1/auth/* (Gateway Identity)",
        "/api/v1/billing/* (Gateway Payments)",
        "/api/v1/telemetry/* (Gateway SRE)",
        "/api/v1/compliance/* (Gateway Governance)",
      ],
      openTechnicalDebtTransferred: deferredDebts.map((d) => ({
        id: d.id,
        priority: d.priority,
        title: d.title,
        category: d.category,
      })),
      nextStepRecommendation: "Introduce Enterprise Solution Architect to review AI Delivery boundaries.",
    };
  }
}
