import { IsString } from 'class-validator';

export class SendMobileOtpDto {

  @IsString()
  mobile: string;

}