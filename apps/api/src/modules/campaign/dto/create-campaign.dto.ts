import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateCampaignDto {
  @IsString({ message: 'Campaign code must be a text string.' })
  @IsNotEmpty({ message: 'Campaign code is required.' })
  code: string;

  @IsString({ message: 'Campaign name must be a text string.' })
  @IsNotEmpty({ message: 'Campaign name is required.' })
  name: string;

  @IsString({ message: 'Campaign type must be a text string.' })
  @IsNotEmpty({ message: 'Campaign type is required.' })
  type: string;

  @IsNumber({}, { message: 'Max entries must be a number.' })
  @IsOptional()
  maxEntries?: number;

  @IsNumber({}, { message: 'Referral limit must be a number.' })
  @IsOptional()
  referralLimit?: number;

  @IsString({ message: 'Start date must be a valid ISO string.' })
  @IsOptional()
  startAt?: string;

  @IsString({ message: 'End date must be a valid ISO string.' })
  @IsOptional()
  endAt?: string;

  @IsString({ message: 'Feature flag must be a text string.' })
  @IsOptional()
  featureFlag?: string;
}
