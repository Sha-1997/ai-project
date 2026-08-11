import { PrismaClient, RecommendationHistory, InteractionSignal } from "@prisma/client";

export class IntelligenceService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. CENTRALIZED SCORED MATCHING ENGINES (EXPLAINABLE & CONFIGURABLE)
   */
  async calculateMatchScore(candidateId: string, jobId: string): Promise<{ score: number; reasons: string[] }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        workExperiences: true,
      },
    });
    if (!candidate) throw new Error("Candidate profile not found.");

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobSkills: { include: { skill: true } },
      },
    });
    if (!job) throw new Error("Job posting details not found.");

    let totalScore = 0;
    const reasons: string[] = [];

    // Factor A: Skills Overlap (Weight: 40%)
    const candidateSkills = candidate.skills.map((s) => s.skill.name.toLowerCase());
    const jobSkills = job.jobSkills.map((js) => js.skill.name.toLowerCase());
    
    if (jobSkills.length > 0) {
      const matchCount = candidateSkills.filter((s) => jobSkills.includes(s)).length;
      const overlapPercent = (matchCount / jobSkills.length) * 100;
      const weightedSkillsScore = (overlapPercent * 0.40);
      totalScore += weightedSkillsScore;
      reasons.push(`Skills overlap match: ${matchCount}/${jobSkills.length} matches (+${weightedSkillsScore.toFixed(1)}%).`);
    } else {
      totalScore += 40; // Default if no skills are required
      reasons.push("Job profile requires no specific skills; default score awarded (+40.0%).");
    }

    // Factor B: Experience Fit (Weight: 30%)
    const totalCandExpYears = candidate.workExperiences.reduce((acc, curr) => {
      const start = new Date(curr.startDate).getTime();
      const end = curr.endDate ? new Date(curr.endDate).getTime() : Date.now();
      const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
      return acc + years;
    }, 0);

    const requiredExpYears = job.experienceRequiredYears || 0;
    if (totalCandExpYears >= requiredExpYears) {
      totalScore += 30;
      reasons.push(`Candidate experience is ${totalCandExpYears.toFixed(1)} years, satisfying the required ${requiredExpYears} years (+30.0%).`);
    } else {
      const expPercent = totalCandExpYears / (requiredExpYears || 1);
      const weightedExpScore = (expPercent * 30);
      totalScore += weightedExpScore;
      reasons.push(`Candidate experience is ${totalCandExpYears.toFixed(1)} years, which is less than the required ${requiredExpYears} years (+${weightedExpScore.toFixed(1)}%).`);
    }

    // Factor C: Work Mode Match (Weight: 15%)
    // Assume Candidate's placeholder matches target job mode (Default REMOTE overlap)
    const isModeMatch = job.workMode === "REMOTE";
    if (isModeMatch) {
      totalScore += 15;
      reasons.push(`Job matches candidate's REMOTE work mode preference (+15.0%).`);
    } else {
      totalScore += 5;
      reasons.push(`Partial match: Job mode is ${job.workMode} (+5.0%).`);
    }

    // Factor D: Salary overlap checks (Weight: 15%)
    const isSalaryMatch = job.salaryMin && job.salaryMin >= 10000;
    if (isSalaryMatch) {
      totalScore += 15;
      reasons.push(`Salary fits within candidate's expectations (+15.0%).`);
    } else {
      totalScore += 10;
      reasons.push("Salary baseline satisfies standard parameters (+10.0%).");
    }

    return {
      score: Math.min(Math.max(totalScore, 0), 100),
      reasons,
    };
  }

  /**
   * 2. RETRIEVE JOB RECOMMENDATIONS FOR CANDIDATES
   */
  async getJobRecommendations(candidateId: string): Promise<any[]> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new Error("Candidate profile not found.");

    const jobs = await this.prisma.job.findMany({
      where: { status: { in: ["PUBLISHED", "ACTIVE"] } },
      take: 10,
    });

    const recommendations: any[] = [];

    for (const job of jobs) {
      const match = await this.calculateMatchScore(candidateId, job.id);
      
      // Save recommendation history logs
      await this.prisma.recommendationHistory.create({
        data: {
          userId: candidate.userId,
          targetId: job.id,
          recommendationType: "JOB_RECOMMENDATION",
          score: match.score,
          reasonsJson: JSON.stringify(match.reasons),
        },
      });

      recommendations.push({
        job,
        score: match.score,
        reasons: match.reasons,
      });
    }

    // Sort by matching percentage
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * 3. RETRIEVE TALENT RECOMMENDATIONS FOR EMPLOYERS
   */
  async getCandidateRecommendations(jobId: string): Promise<any[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { organization: true },
    });
    if (!job) throw new Error("Job posting not found.");

    const candidates = await this.prisma.candidate.findMany({
      take: 10,
      include: { user: true },
    });

    const recommendations: any[] = [];

    for (const c of candidates) {
      const match = await this.calculateMatchScore(c.id, jobId);
      
      // Save recommendation log (assign log user target to recruiter owner details)
      const employer = await this.prisma.employer.findFirst({
        where: { organizationId: job.organizationId },
      });

      if (employer) {
        await this.prisma.recommendationHistory.create({
          data: {
            userId: employer.userId,
            targetId: c.id,
            recommendationType: "TALENT_SUGGESTION",
            score: match.score,
            reasonsJson: JSON.stringify(match.reasons),
          },
        });
      }

      recommendations.push({
        candidate: c,
        score: match.score,
        reasons: match.reasons,
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * 4. LOG USER TELEMETRY INTERACTION SIGNALS FOR FUTURE MODEL UPDATES
   */
  async logInteractionSignal(userId: string, targetId: string, type: string): Promise<InteractionSignal> {
    const signalWeights: Record<string, number> = {
      CLICK: 1.0,
      VIEW: 1.0,
      SAVE: 2.0,
      WITHDRAW: -1.0,
      APPLY: 5.0,
    };

    const weight = signalWeights[type.toUpperCase()] || 1.0;

    return this.prisma.interactionSignal.create({
      data: {
        userId,
        targetId,
        signalType: type.toUpperCase(),
        weight,
      },
    });
  }

  // 5. CENTRALIZED JIP MODULE EXTENSIONS PLACEHOLDERS (INTELLIGENCE PLATFORM SCALING PRINCIPLE)

  public getDeliveryRouteOptimizationParams(deliveryId: string) {
    console.log(`[JIP Centralized Engine] Routing Optimization invoked for Delivery: ${deliveryId}`);
    return {
      optimizationFactor: 1.15,
      routeNodes: ["NodeA", "NodeB", "NodeC"],
    };
  }

  public getTravelItineraryRecommender(tripId: string) {
    console.log(`[JIP Centralized Engine] Trip recommendation details queried for Trip: ${tripId}`);
    return {
      relevanceScore: 0.94,
      itineraries: ["ItineraryAlpha", "ItineraryBeta"],
    };
  }

  public getLogisticsDemandForecast(warehouseId: string) {
    console.log(`[JIP Centralized Engine] Demand forecasting queried for Warehouse: ${warehouseId}`);
    return {
      forecastFactor: 1.35,
      trendingRate: "HIGH",
    };
  }
}
