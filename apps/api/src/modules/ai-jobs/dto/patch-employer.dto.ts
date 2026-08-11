import { IsString, IsOptional, IsEmail } from 'class-validator';

export class PatchEmployerDto {
  @IsString({ message: 'Recruiter title must be a valid text string.' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Department must be a valid text string.' })
  @IsOptional()
  department?: string;

  @IsEmail({}, { message: 'Business email must be a valid email address.' })
  @IsOptional()
  businessEmail?: string;

  @IsString({ message: 'Contact phone number must be a valid text string.' })
  @IsOptional()
  contactNumber?: string;
}
