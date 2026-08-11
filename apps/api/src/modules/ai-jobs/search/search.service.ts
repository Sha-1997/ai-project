import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PostgresSearchProvider } from './providers/postgres-search.provider';
import { SearchCriteria } from './providers/search-provider.interface';
import { CreateSavedSearchDto } from '../dto/create-saved-search.dto';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchProvider: PostgresSearchProvider,
  ) {}

  /**
   * Search jobs matching complex criteria & log history audit
   */
  async searchJobs(userId: string | null, criteria: SearchCriteria) {
    // 1. Execute search query via provider interface
    const results = await this.searchProvider.search(criteria);

    // 2. Audit history log asynchronously to avoid query blocking (lightweight audit)
    this.prisma.searchHistory
      .create({
        data: {
          userId,
          queryText: criteria.keyword || null,
          filters: criteria as any,
        },
      })
      .catch((err) => {
        console.error('Failed to log search history audit:', err);
      });

    return results;
  }

  /**
   * Increment job details views counter asynchronously (lightweight audit)
   */
  async incrementJobView(userId: string | null, jobId: string) {
    this.prisma.jobView
      .create({
        data: {
          jobId,
          userId,
        },
      })
      .catch((err) => {
        console.error('Failed to log job view audit:', err);
      });

    return { success: true };
  }

  /**
   * Create saved search profile
   */
  async createSavedSearch(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name.trim(),
        criteria: dto.criteria as any,
      },
    });
  }

  /**
   * Get my saved searches
   */
  async getSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(userId: string, id: string) {
    const saved = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!saved) {
      throw new NotFoundException('Saved search not found.');
    }

    if (saved.userId !== userId) {
      throw new ForbiddenException('You do not own this saved search configuration.');
    }

    await this.prisma.savedSearch.delete({
      where: { id },
    });

    return { success: true };
  }
}
