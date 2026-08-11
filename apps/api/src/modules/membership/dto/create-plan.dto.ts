import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min, IsBoolean } from 'class-validator';

export class CreatePlanDto {
  @IsString({ message: 'Plan code must be a text string.' })
  @IsNotEmpty({ message: 'Plan code is required.' })
  code: string;

  @IsString({ message: 'Plan name must be a text string.' })
  @IsNotEmpty({ message: 'Plan name is required.' })
  name: string;

  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0, { message: 'Price cannot be negative.' })
  price: number;

  @IsString({ message: 'Currency must be a text string.' })
  @IsOptional()
  currency?: string = 'AED';

  @IsNumber({}, { message: 'Duration must be a number of years.' })
  @Min(1, { message: 'Duration must be at least 1 year.' })
  durationYears: number;

  @IsNumber({}, { message: 'Max seats must be a number.' })
  @IsOptional()
  maxSeats?: number;

  @IsString({ message: 'Active from must be a valid ISO date string.' })
  @IsOptional()
  activeFrom?: string;

  @IsString({ message: 'Active to must be a valid ISO date string.' })
  @IsOptional()
  activeTo?: string;

  @IsString({ message: 'Description must be a text string.' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Benefits must be a list of strings.' })
  @IsOptional()
  benefits?: string[] = [];

  @IsBoolean({ message: 'isActive must be a boolean.' })
  @IsOptional()
  isActive?: boolean = true;
}
