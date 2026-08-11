import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateJobDto {
  @IsString({ message: 'Job title must be a text string.' })
  @IsNotEmpty({ message: 'Job title is required.' })
  title: string;

  @IsString({ message: 'Job description must be a text string.' })
  @IsNotEmpty({ message: 'Job description is required.' })
  description: string;

  @IsString({ message: 'Employment type must be a text string.' })
  @IsNotEmpty({ message: 'Employment type is required.' })
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'], {
    message: 'Employment type must be FULL_TIME, PART_TIME, CONTRACT, or INTERNSHIP.',
  })
  employmentType: string;

  @IsNumber({}, { message: 'Minimum salary must be a valid number.' })
  @IsOptional()
  salaryMin?: number;

  @IsNumber({}, { message: 'Maximum salary must be a valid number.' })
  @IsOptional()
  salaryMax?: number;

  @IsNumber({}, { message: 'Experience years required must be a valid number.' })
  @IsOptional()
  experienceYears?: number;

  @IsArray({ message: 'Required skills must be an array of strings.' })
  @IsOptional()
  skillsRequired?: string[];

  @IsString({ message: 'Company reference identifier must be a valid UUID string.' })
  @IsNotEmpty({ message: 'Company ID is required.' })
  companyId: string;
}
