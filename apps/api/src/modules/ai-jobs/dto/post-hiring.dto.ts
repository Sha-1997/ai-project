import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class PostHiringDto {
  @IsString({ message: 'Hiring decision must be a valid text string.' })
  @IsNotEmpty({ message: 'Hiring decision is required.' })
  @IsEnum(['OFFER', 'HIRED', 'REJECTED'], {
    message: 'Decision must be OFFER, HIRED, or REJECTED.',
  })
  decision: string;

  @IsNumber({}, { message: 'Offered salary must be a valid number.' })
  @IsOptional()
  offeredSalary?: number;

  @IsString({ message: 'Joined date must be an ISO date string.' })
  @IsOptional()
  joinedAt?: string;

  @IsString({ message: 'Decision details notes must be a text string.' })
  @IsOptional()
  notes?: string;
}
