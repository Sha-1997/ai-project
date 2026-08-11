import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token must be a text string.' })
  @IsNotEmpty({ message: 'Reset token is required.' })
  token: string;

  @IsString({ message: 'Password must be a text string.' })
  @Length(8, 32, { message: 'Password must be between 8 and 32 characters long.' })
  password: string;

  @IsString({ message: 'Confirm password must be a text string.' })
  @IsNotEmpty({ message: 'Confirm password is required.' })
  confirmPassword: string;
}
