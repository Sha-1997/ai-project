import { Module } from '@nestjs/common';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { ApplicationsController } from './applications/applications.controller';
import { ApplicationsService } from './applications/applications.service';
import { CandidatesController } from './candidates/candidates.controller';
import { CandidatesService } from './candidates/candidates.service';
import { EmployersController } from './employers/employers.controller';
import { EmployersService } from './employers/employers.service';
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { VerificationController } from './verification/verification.controller';
import { VerificationService } from './verification/verification.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { PostgresSearchProvider } from './search/providers/postgres-search.provider';
import { OperationsController } from './operations/operations.controller';
import { OperationsService } from './operations/operations.service';
import { AtsService } from './ats.service';
import { ResumeController } from './resume/resume.controller';
import { ResumeService } from './resume/resume.service';
import { CareerController } from './career/career.controller';
import { CareerService } from './career/career.service';

@Module({
  controllers: [
    JobsController,
    ApplicationsController,
    CandidatesController,
    EmployersController,
    OrganizationsController,
    VerificationController,
    SearchController,
    OperationsController,
    ResumeController,
    CareerController,
  ],
  providers: [
    JobsService,
    ApplicationsService,
    CandidatesService,
    EmployersService,
    OrganizationsService,
    VerificationService,
    SearchService,
    PostgresSearchProvider,
    OperationsService,
    AtsService,
    ResumeService,
    CareerService,
  ],
  exports: [
    JobsService,
    ApplicationsService,
    CandidatesService,
    EmployersService,
    OrganizationsService,
    VerificationService,
    SearchService,
    OperationsService,
    AtsService,
    ResumeService,
    CareerService,
  ],
})
export class AiJobsModule {}
