import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PostEducationDto {
  @IsString({ message: 'Institution must be a valid text string.' })
  @IsNotEmpty({ message: 'Institution name is required.' })
  institution: string;

  @IsString({ message: 'Degree designation must be a valid text string.' })
  @IsNotEmpty({ message: 'Degree designation is required.' })
  degree: string;

  @IsString({ message: 'Field of study must be a valid text string.' })
  @IsOptional()
  fieldOfStudy?: string;

  @IsString({ message: 'Start date must be an ISO date string.' })
  @IsNotEmpty({ message: 'Start date is required.' })
  startDate: string;

  @IsString({ message: 'End date must be an ISO date string.' })
  @IsOptional()
  endDate?: string;

  @IsString({ message: 'Grade must be a valid text string.' })
  @IsOptional()
  grade?: string;
}
