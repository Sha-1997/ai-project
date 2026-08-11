import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CandidateLoginProvider {
  EMAIL_OTP = 'EMAIL_OTP',
  MOBILE_OTP = 'MOBILE_OTP',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}


export class CandidateLoginDto {

  @IsEnum(CandidateLoginProvider)
  provider: CandidateLoginProvider;


  @IsOptional()
  @IsString()
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