import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsString({ message: 'Country name must be a valid text string.' })
  @IsNotEmpty({ message: 'Country is required.' })
  country: string;

  @IsString({ message: 'State or province name must be a valid text string.' })
  @IsOptional()
  state?: string;

  @IsString({ message: 'City name must be a valid text string.' })
  @IsOptional()
  city?: string;

  @IsString({ message: 'Workplace type must be a valid text string.' })
  @IsOptional()
  workplaceType?: string; // REMOTE, HYBRID, ONSITE
}

export class CreateJobV2Dto {
  @IsString({ message: 'Job title must be a valid text string.' })
  @IsNotEmpty({ message: 'Job title is required.' })
  title: string;

  @IsString({ message: 'Job description must be a valid text string.' })
  @IsNotEmpty({ message: 'Job description is required.' })
  description: string;

  @IsString({ message: 'Employment type must be a valid text string.' })
  @IsNotEmpty({ message: 'Employment type is required.' })
  employmentType: string;

  @IsNumber({}, { message: 'Minimum salary must be a valid number.' })
  @IsOptional()
  salaryMin?: number;

  @IsNumber({}, { message: 'Maximum salary must be a valid number.' })
  @IsOptional()
  salaryMax?: number;

  @IsBoolean({ message: 'Salary visibility flag must be a boolean.' })
  @IsOptional()
  salaryVisible?: boolean;

  @IsNumber({}, { message: 'Experience years required must be a valid number.' })
  @IsOptional()
  experienceYears?: number;

  @IsString({ message: 'Experience level must be a valid text string.' })
  @IsOptional()
  experienceLevel?: string; // ENTRY, MID, SENIOR, LEAD

  @IsString({ message: 'Department must be a valid text string.' })
  @IsOptional()
  department?: string;

  @IsString({ message: 'Industry must be a valid text string.' })
  @IsOptional()
  industry?: string;

  @IsString({ message: 'Category designation name must be a valid text string.' })
  @IsOptional()
  categoryName?: string;

  @IsArray({ message: 'Skills must be an array of strings.' })
  @IsOptional()
  skills?: string[];

  @IsArray({ message: 'Benefits must be an array of strings.' })
  @IsOptional()
  benefits?: string[];

  @IsArray({ message: 'Locations list must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  @IsOptional()
  locations?: LocationDto[];

 
}
