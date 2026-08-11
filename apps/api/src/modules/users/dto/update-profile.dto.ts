import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Full name must be a text string.' })
  @IsNotEmpty({ message: 'Full name cannot be empty.' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Phone number must be a text string.' })
  @IsOptional()
  phoneNumber?: string;
}
