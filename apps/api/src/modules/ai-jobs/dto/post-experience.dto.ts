import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class PostExperienceDto {
  @IsString({ message: 'Job title must be a valid text string.' })
  @IsNotEmpty({ message: 'Job title is required.' })
  title: string;

  @IsString({ message: 'Company name must be a valid text string.' })
  @IsNotEmpty({ message: 'Company name is required.' })
  companyName: string;

  @IsString({ message: 'Location must be a valid text string.' })
  @IsOptional()
  location?: string;

  @IsString({ message: 'Start date must be an ISO date string.' })
  @IsNotEmpty({ message: 'Start date is required.' })
  startDate: string;

  @IsString({ message: 'End date must be an ISO date string.' })
  @IsOptional()
  endDate?: string;

  @IsBoolean({ message: 'isCurrent must be a boolean flag.' })
  @IsOptional()
  isCurrent?: boolean;

  @IsString({ message: 'Job description must be a valid text string.' })
  @IsOptional()
  description?: string;
}
