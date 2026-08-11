import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JobsService } from '../jobs/jobs.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CreateSavedSearchDto } from '../dto/create-saved-search.dto';

@Controller()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly jobsService: JobsService,
  ) {}

  @Get('jobs/search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Req() req: any,
    @Query('keyword') keyword?: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('workplaceType') workplaceType?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('categoryId') categoryId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('sortBy') sortBy?: 'NEWEST' | 'OLDEST' | 'SALARY_HIGH_TO_LOW' | 'SALARY_LOW_TO_HIGH',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const salMin = salaryMin ? parseFloat(salaryMin) : undefined;
    const salMax = salaryMax ? parseFloat(salaryMax) : undefined;

    // Optional user ID context extraction from auth header if available
    let userId: string | null = null;
    if (req.headers && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || null;
      } catch (e) {
        // Safe ignore if token parsing fails
      }
    }

    return this.searchService.searchJobs(userId, {
      keyword,
      skills,
      location,
      workplaceType,
      salaryMin: salMin,
      salaryMax: salMax,
      experienceLevel,
      categoryId,
      organizationId,
      sortBy,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get('jobs/:id')
  @HttpCode(HttpStatus.OK)
  async getJobDetails(@Req() req: any, @Param('id') id: string) {
    // 1. Fetch job posting
    const job = await this.jobsService.getJobById(id);

    // 2. Extract optional user ID context
    let userId: string | null = null;
    if (req.headers && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || null;
      } catch (e) {
        // Safe ignore
      }
    }

    // 3. Increment job view count asynchronously
    await this.searchService.incrementJobView(userId, id);

    return job;
  }

  @Post('searches')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveSearch(@Req() req: any, @Body() dto: CreateSavedSearchDto) {
    const userId = req.user.sub;
    return this.searchService.createSavedSearch(userId, dto);
  }

  @Get('searches/me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMySaved(@Req() req: any) {
    const userId = req.user.sub;
    return this.searchService.getSavedSearches(userId);
  }

  @Delete('searches/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeSaved(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.searchService.deleteSavedSearch(userId, id);
  }
}
