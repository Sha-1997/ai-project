import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Full name must be a text string.' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Phone number must be a text string.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString({ message: 'Country must be a text string.' })
  @IsOptional()
  country?: string;

  @IsString({ message: 'Profile photo URL must be a text string.' })
  @IsOptional()
  profilePhoto?: string;

  @IsString({ message: 'Date of birth must be an ISO date string.' })
  @IsOptional()
  dob?: string;

  @IsString({ message: 'City must be a text string.' })
  @IsOptional()
  city?: string;

  @IsString({ message: 'Preferred language must be a text string.' })
  @IsOptional()
  preferredLanguage?: string;

  @IsString({ message: 'Resume URL must be a text string.' })
  @IsOptional()
  resumeUrl?: string;

  @IsArray({ message: 'Skills must be an array of text strings.' })
  @IsOptional()
  skills?: string[];

  @IsArray({ message: 'Career preferences must be an array of text strings.' })
  @IsOptional()
  careerPreferences?: string[];
}
