import { PrismaClient, Job, SavedSearch, SearchHistory, SearchAnalytics } from "@prisma/client";

export interface JobSearchFilters {
  query?: string;
  categoryId?: string;
  skillsList?: string[];
  workMode?: string;
  employmentType?: string;
  countryCode?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceRequiredYears?: number;
}

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

// 1. SEARCH ABSTRACTION LAYER INTERFACE
export interface SearchInterface {
  searchJobs(filters: JobSearchFilters, pagination: PaginationInput, sorting?: string): Promise<Job[]>;
}

// 2. POSTGRES SQL IMPLEMENTATION ADAPTER
export class PostgresSearchAdapter implements SearchInterface {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async searchJobs(filters: JobSearchFilters, pagination: PaginationInput, sorting?: string): Promise<Job[]> {
    const whereClause: any = {
      status: { in: ["PUBLISHED", "ACTIVE"] }, // Security: Catalog search only pulls active/published jobs
      organization: {
        verificationStatus: "VERIFIED", // KYC isolation rule
      },
    };

    // Filter by category
    if (filters.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    // Filter by work mode (REMOTE, HYBRID, ONSITE)
    if (filters.workMode) {
      whereClause.workMode = filters.workMode;
    }

    // Filter by employment type (Full-time, Contract, etc.)
    if (filters.employmentType) {
      whereClause.employmentType = filters.employmentType;
    }

    // Filter by geographic codes
    if (filters.countryCode) {
      whereClause.countryCode = filters.countryCode;
    }

    if (filters.city) {
      whereClause.locationDetails = { contains: filters.city, mode: "insensitive" };
    }

    // Filter by salary bounds
    if (filters.salaryMin !== undefined) {
      whereClause.salaryMax = { gte: filters.salaryMin };
    }
    if (filters.salaryMax !== undefined) {
      whereClause.salaryMin = { lte: filters.salaryMax };
    }

    // Filter by experience required years
    if (filters.experienceRequiredYears !== undefined) {
      whereClause.experienceRequiredYears = { lte: filters.experienceRequiredYears };
    }

    // Filter by matching skills
    if (filters.skillsList && filters.skillsList.length > 0) {
      whereClause.jobSkills = {
        some: {
          skill: {
            name: { in: filters.skillsList, mode: "insensitive" },
          },
        },
      };
    }

    // Text queries exact/partial matching using full-text mocks
    if (filters.query) {
      whereClause.OR = [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
        { department: { contains: filters.query, mode: "insensitive" } },
      ];
    }

    // Configure sorting strategies
    let orderBy: any = { createdAt: "desc" };
    if (sorting === "SALARY_DESC") {
      orderBy = { salaryMax: "desc" };
    } else if (sorting === "SALARY_ASC") {
      orderBy = { salaryMin: "asc" };
    } else if (sorting === "DEADLINE") {
      orderBy = { applicationDeadline: "asc" };
    }

    return this.prisma.job.findMany({
      where: whereClause,
      take: pagination.limit || 10,
      skip: pagination.offset || 0,
      orderBy,
      include: {
        organization: {
          select: { name: true, websiteUrl: true },
        },
        category: true,
      },
    });
  }
}

// 3. SEARCH ORCHESTRATION SERVICE (HOUSES HISTORY, SAVED SEARCHES AND SUGGESTIONS)
export class SearchService {
  private prisma: PrismaClient;
  private searchAdapter: SearchInterface;

  constructor(prismaClient?: PrismaClient, adapter?: SearchInterface) {
    this.prisma = prismaClient || new PrismaClient();
    this.searchAdapter = adapter || new PostgresSearchAdapter(this.prisma);
  }

  /**
   * EXECUTE SEARCH WITH TELEMETRY AND ANALYTICS LOGS
   */
  async executeJobSearch(
    filters: JobSearchFilters,
    pagination: PaginationInput,
    sorting?: string,
    userId?: string
  ): Promise<Job[]> {
    const results = await this.searchAdapter.searchJobs(filters, pagination, sorting);
    const isEmpty = results.length === 0;

    // Log analytics telemetry
    if (filters.query) {
      await this.logSearchAnalytics(filters.query, filters, isEmpty);

      // Optionally save user search history logs
      if (userId) {
        await this.saveSearchHistory(userId, filters.query, filters);
      }
    }

    return results;
  }

  /**
   * SAVE SEARCH CRITERIA
   */
  async saveSearch(userId: string, searchTitle: string, filters: JobSearchFilters): Promise<SavedSearch> {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        searchTitle,
        filterParametersJson: JSON.stringify(filters),
        isAlertEnabled: false,
      },
    });
  }

  /**
   * GET SAVED SEARCHES LIST
   */
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * RETRIEVE USER SEARCH HISTORY
   */
  async getSearchHistory(userId: string): Promise<SearchHistory[]> {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * AUTOCOMPLETE SEARCH SUGGESTIONS
   */
  async getAutocompleteSuggestions(query: string): Promise<string[]> {
    const matchingSkills = await this.prisma.skill.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 5,
      select: { name: true },
    });

    const matchingCategories = await this.prisma.jobCategory.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 5,
      select: { name: true },
    });

    return [
      ...matchingSkills.map((s) => s.name),
      ...matchingCategories.map((c) => c.name),
    ];
  }

  /**
   * INTERNAL TELEMETRY LOGGER
   */
  private async logSearchAnalytics(term: string, filters: JobSearchFilters, isEmpty: boolean): Promise<void> {
    await this.prisma.searchAnalytics.create({
      data: {
        searchTerm: term,
        filterUsageJson: JSON.stringify(filters),
        isEmptySearch: isEmpty,
        resultClicksCount: 0,
      },
    });
  }

  /**
   * INTERNAL HISTORY BUILDER
   */
  private async saveSearchHistory(userId: string, term: string, filters: JobSearchFilters): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        userId,
        searchTerms: term,
        filterUsageJson: JSON.stringify(filters),
      },
    });
  }
}
