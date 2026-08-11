import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class ApplyJobDto {
  @IsString({ message: 'Job ID must be a valid UUID string.' })
  @IsNotEmpty({ message: 'Job ID is required.' })
  jobId: string;

  @IsString({ message: 'Application notes must be a text string.' })
  @IsOptional()
  @Length(10, 1000, { message: 'Notes must be between 10 and 1000 characters long.' })
  notes?: string;
}
