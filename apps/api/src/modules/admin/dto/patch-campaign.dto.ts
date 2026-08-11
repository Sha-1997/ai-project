import { IsString, IsOptional, IsNumber } from 'class-validator';

export class PatchCampaignDto {
  @IsString({ message: 'Campaign status must be a text string.' })
  @IsOptional()
  status?: string;

  @IsString({ message: 'End date must be a valid ISO string.' })
  @IsOptional()
  endAt?: string;

  @IsNumber({}, { message: 'Max entries limit must be a number.' })
  @IsOptional()
  maxEntries?: number;
}
