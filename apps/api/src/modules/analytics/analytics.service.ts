import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate core conversion metrics
   */
  async getSummaryMetrics() {
    const totalCandidates = await this.prisma.candidate.count();
    const totalEmployers = await this.prisma.employer.count();
    const totalJobs = await this.prisma.job.count({ where: { status: 'PUBLISHED' } });
    const totalApplications = await this.prisma.jobApplication.count();

    // 1. Calculate search keyword frequency metrics from telemetry
    const searchHistories = await this.prisma.searchHistory.findMany({
      take: 100,
      select: { queryText: true },
    });

    const keywordCounts: Record<string, number> = {};
    searchHistories.forEach((sh) => {
      if (sh.queryText) {
        const kw = sh.queryText.trim().toLowerCase();
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      }
    });

    const popularKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeCandidatesCount: totalCandidates,
      activeEmployersCount: totalEmployers,
      publishedJobsCount: totalJobs,
      totalApplicationsCount: totalApplications,
      conversionRatePercent: totalJobs > 0 ? (totalApplications / totalJobs) * 100 : 0,
      popularKeywords,
    };
  }

  /**
   * Aggregate candidate funnel conversion stages metrics
   */
  async getFunnelMetrics() {
    const totalViews = await this.prisma.jobView.count();
    const totalApplied = await this.prisma.jobApplication.count();
    const totalShortlisted = await this.prisma.jobApplication.count({
      where: { status: 'SHORTLISTED' },
    });
    const totalHired = await this.prisma.jobApplication.count({
      where: { status: 'HIRED' },
    });

    return {
      funnel: [
        { stage: '1_VIEWS', count: totalViews, conversionFromPrevious: 100 },
        {
          stage: '2_APPLIED',
          count: totalApplied,
          conversionFromPrevious: totalViews > 0 ? (totalApplied / totalViews) * 100 : 0,
        },
        {
          stage: '3_SHORTLISTED',
          count: totalShortlisted,
          conversionFromPrevious: totalApplied > 0 ? (totalShortlisted / totalApplied) * 100 : 0,
        },
        {
          stage: '4_HIRED',
          count: totalHired,
          conversionFromPrevious: totalShortlisted > 0 ? (totalHired / totalShortlisted) * 100 : 0,
        },
      ],
    };
  }

  /**
   * Export JSON analytical data lake metrics dump
   */
  async exportStructuredReport() {
    const activeCandidates = await this.prisma.candidate.findMany({
      take: 10,
      select: {
        id: true,
        headline: true,
        status: true,
      },
    });

    return {
      reportType: 'AI_PLATFORM_TELEMETRY',
      exportedAt: new Date().toISOString(),
      dataset: {
        candidatesSample: activeCandidates,
      },
    };
  }
}
