import { IsString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';

export class PatchCandidateDto {
  @IsString({ message: 'Headline must be a valid text string.' })
  @IsOptional()
  headline?: string;

  @IsString({ message: 'Career summary must be a valid text string.' })
  @IsOptional()
  careerSummary?: string;

  @IsString({ message: 'Current location must be a valid text string.' })
  @IsOptional()
  currentLocation?: string;

  @IsString({ message: 'Preferred location must be a valid text string.' })
  @IsOptional()
  preferredLocation?: string;

  @IsString({ message: 'Visibility setting must be a valid text string.' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'ANONYMOUS'], {
    message: 'Visibility must be PUBLIC, PRIVATE, or ANONYMOUS.',
  })
  visibility?: string;

  @IsString({ message: 'Resume URL must be a valid text string.' })
  @IsOptional()
  resumeUrl?: string;

  @IsArray({ message: 'Skills must be an array of strings.' })
  @IsOptional()
  skills?: string[];

  // Career preference overrides
  @IsString({ message: 'Employment type preference must be a valid text string.' })
  @IsOptional()
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'], {
    message: 'Employment type preference must be FULL_TIME, PART_TIME, CONTRACT, or INTERNSHIP.',
  })
  employmentType?: string;

  @IsNumber({}, { message: 'Salary expectation must be a valid number.' })
  @IsOptional()
  salaryExpectation?: number;

  @IsNumber({}, { message: 'Notice period days must be a number.' })
  @IsOptional()
  noticePeriodDays?: number;

  @IsString({ message: 'Remote preference must be a valid text string.' })
  @IsOptional()
  @IsEnum(['REMOTE', 'HYBRID', 'ONSITE'], {
    message: 'Remote preference must be REMOTE, HYBRID, or ONSITE.',
  })
  remotePreference?: string;
}
