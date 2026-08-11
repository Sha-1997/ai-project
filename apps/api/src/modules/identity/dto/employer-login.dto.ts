import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
} from 'class-validator';


export enum EmployerLoginProvider {
  EMAIL_OTP = 'EMAIL_OTP',
  MOBILE_OTP = 'MOBILE_OTP',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}


export class EmployerLoginDto {


  @IsEnum(EmployerLoginProvider)
  provider: EmployerLoginProvider;



  @IsOptional()
  @IsEmail()
  email?: string;



  @IsOptional()
  @IsString()
  mobile?: string;



  @IsOptional()
  @IsString()
  otp?: string;



  @IsOptional()
  @IsString()
  idToken?: string;

}