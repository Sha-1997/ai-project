import { IsEmail, IsString, IsOptional, Length, IsNotEmpty, IsBoolean } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Full name must be a text string.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'Phone number must be a text string.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString({ message: 'Country must be a text string.' })
  @IsNotEmpty({ message: 'Country is required.' })
  country: string;

  @IsString({ message: 'Password must be a text string.' })
  @Length(8, 32, { message: 'Password must be between 8 and 32 characters long.' })
  password: string;

  @IsString({ message: 'Confirm password must be a text string.' })
  @IsNotEmpty({ message: 'Confirm password is required.' })
  confirmPassword: string;

  @IsString({ message: 'Referral code must be a text string.' })
  @IsOptional()
  referralCode?: string;

  @IsBoolean({ message: 'Marketing consent must be a boolean value.' })
  @IsOptional()
  marketingConsent?: boolean = false;
}
