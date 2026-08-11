import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class ReviewVerificationDto {
  @IsString({ message: 'Review action must be a valid text string.' })
  @IsNotEmpty({ message: 'Review action is required.' })
  @IsEnum(['APPROVED', 'REJECTED', 'REQUESTED_INFO'], {
    message: 'Action must be APPROVED, REJECTED, or REQUESTED_INFO.',
  })
  action: string;

  @IsString({ message: 'Internal reviewer notes must be a text string.' })
  @IsOptional()
  notes?: string;
}
