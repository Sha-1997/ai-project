import { IsString, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsString({ message: 'Subscription status must be a text string.' })
  @IsOptional()
  status?: string;

  @IsString({ message: 'Expiry expiration date must be a valid ISO string.' })
  @IsOptional()
  expiresAt?: string;

  @IsString({ message: 'Audit override notes reason is required.' })
  @IsOptional()
  reason?: string;
}
