import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreatePlanDto {
  @IsString({ message: 'Plan code must be a text string.' })
  @IsNotEmpty({ message: 'Plan code is required.' })
  code: string;

  @IsString({ message: 'Plan name must be a text string.' })
  @IsNotEmpty({ message: 'Plan name is required.' })
  name: string;

  @IsNumber({}, { message: 'Plan price must be a valid number.' })
  @IsNotEmpty({ message: 'Plan price is required.' })
  price: number;

  @IsNumber({}, { message: 'Plan duration in years must be a valid number.' })
  @IsNotEmpty({ message: 'Plan duration is required.' })
  durationYears: number;

  @IsNumber({}, { message: 'Max seats limit must be a number.' })
  @IsOptional()
  maxSeats?: number;

  @IsString({ message: 'Plan description must be a text string.' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Benefits list must be an array of strings.' })
  @IsOptional()
  benefits?: string[];
}
