import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PatchApplicationStatusDto {
  @IsString({ message: 'Application status must be a valid text string.' })
  @IsNotEmpty({ message: 'Application status is required.' })
  status: string; // APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED, OFFER_EXTENDED, HIRED, REJECTED, WITHDRAWN

  @IsString({ message: 'Transition details comments must be a text string.' })
  @IsOptional()
  notes?: string;
}
