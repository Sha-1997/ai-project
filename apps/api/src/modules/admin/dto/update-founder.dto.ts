import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateFounderDto {
  @IsString({ message: 'Founder tier must be a text string.' })
  @IsOptional()
  tier?: string;

  @IsString({ message: 'Badge status must be a text string.' })
  @IsOptional()
  badgeStatus?: string;

  @IsBoolean({ message: 'isActive must be a boolean.' })
  @IsOptional()
  isActive?: boolean;

  @IsString({ message: 'Admin notes must be a text string.' })
  @IsOptional()
  notes?: string;

  @IsString({ message: 'Plan ID must be a text string.' })
  @IsOptional()
  planId?: string;

  @IsString({ message: 'Subscription status must be a text string.' })
  @IsOptional()
  subscriptionStatus?: string;
}
