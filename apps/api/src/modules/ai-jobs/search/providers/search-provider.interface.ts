export interface SearchCriteria {
  keyword?: string;
  skills?: string; // Comma-separated tags
  location?: string; // matches city or country
  workplaceType?: string; // REMOTE, HYBRID, ONSITE
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string; // ENTRY, MID, SENIOR, LEAD
  categoryId?: string;
  organizationId?: string;
  sortBy?: 'NEWEST' | 'OLDEST' | 'SALARY_HIGH_TO_LOW' | 'SALARY_LOW_TO_HIGH';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  jobs: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ISearchProvider {
  search(criteria: SearchCriteria): Promise<SearchResult>;
}
