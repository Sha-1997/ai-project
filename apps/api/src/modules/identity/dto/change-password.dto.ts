import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Old password must be a text string.' })
  @IsNotEmpty({ message: 'Old password is required.' })
  oldPassword: string;

  @IsString({ message: 'New password must be a text string.' })
  @Length(8, 32, { message: 'New password must be between 8 and 32 characters long.' })
  newPassword: string;

  @IsString({ message: 'Confirm password must be a text string.' })
  @IsNotEmpty({ message: 'Confirm password is required.' })
  confirmPassword: string;
}
