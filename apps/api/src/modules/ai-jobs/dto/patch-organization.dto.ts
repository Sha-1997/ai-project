import {
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';

import { Transform } from 'class-transformer';


export class PatchOrganizationDto {


  @IsString({
    message: 'Organization name must be a valid text string.',
  })
  @IsOptional()
  name?: string;



  @IsString({
    message: 'Industry must be a valid text string.',
  })
  @IsOptional()
  industry?: string;



  @IsString({
    message: 'Company size must be a valid text string.',
  })
  @IsOptional()
  companySize?: string;



  @IsString({
    message: 'Website URL must be a valid text string.',
  })
  @IsOptional()
  website?: string;



  @IsString({
    message: 'Headquarters location must be a valid text string.',
  })
  @IsOptional()
  headquarters?: string;



  @IsArray({
    message: 'Countries must be an array.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);
    }
  })
  countries?: string[];



  @IsString({
    message: 'Logo URL must be a valid text string.',
  })
  @IsOptional()
  logoUrl?: string;

}