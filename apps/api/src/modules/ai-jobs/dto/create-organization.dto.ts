import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateOrganizationDto {
  @IsString({ message: 'Organization name must be a valid text string.' })
  @IsNotEmpty({ message: 'Organization name is required.' })
  name: string;

  @IsString({ message: 'Industry must be a valid text string.' })
  @IsOptional()
  industry?: string;

  @IsString({ message: 'Company size must be a valid text string.' })
  @IsOptional()
  companySize?: string;

  @IsString({ message: 'Website URL must be a valid URL string.' })
  @IsOptional()
  website?: string;

  @IsString({ message: 'Headquarters location details must be a valid text string.' })
  @IsOptional()
  headquarters?: string;

  @IsArray({ message: 'Operating countries list must be an array of strings.' })
  @IsOptional()
  countries?: string[];
}
