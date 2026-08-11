import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePlanDto {
  @IsString({ message: 'Plan name must be a text string.' })
  @IsOptional()
  name?: string;

  @IsNumber({}, { message: 'Plan price must be a valid number.' })
  @IsOptional()
  price?: number;

  @IsNumber({}, { message: 'Max seats limit must be a number.' })
  @IsOptional()
  maxSeats?: number;

  @IsBoolean({ message: 'isActive status must be a boolean value.' })
  @IsOptional()
  isActive?: boolean;

  @IsString({ message: 'Plan description must be a text string.' })
  @IsOptional()
  description?: string;
}
