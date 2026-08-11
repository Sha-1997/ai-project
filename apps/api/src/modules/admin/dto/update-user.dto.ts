import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString({ message: 'User status must be a text string.' })
  @IsOptional()
  status?: string;

  @IsString({ message: 'Full name must be a text string.' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Phone number must be a text string.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString({ message: 'Country must be a text string.' })
  @IsOptional()
  country?: string;
}
