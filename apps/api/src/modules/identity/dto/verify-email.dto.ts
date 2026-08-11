import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'Verification token must be a text string.' })
  @IsNotEmpty({ message: 'Verification token is required.' })
  token: string;
}
