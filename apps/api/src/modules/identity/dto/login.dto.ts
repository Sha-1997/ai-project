import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'Password must be a text string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
