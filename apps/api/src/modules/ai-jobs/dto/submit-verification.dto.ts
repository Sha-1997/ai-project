import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class VerificationDocDto {
  @IsString({ message: 'Document type must be a valid text string.' })
  @IsNotEmpty({ message: 'Document type is required.' })
  documentType: string; // TRADE_LICENSE, TAX_REGISTRATION, BUSINESS_REGISTRATION, ADDRESS_PROOF

  @IsString({ message: 'Secure file URL must be a valid text string.' })
  @IsNotEmpty({ message: 'Secure file URL is required.' })
  secureUrl: string;
}

export class SubmitVerificationDto {
  @IsString({ message: 'Verification level must be a valid text string.' })
  @IsOptional()
  level?: string; // BASIC, BUSINESS, PREMIUM

  @IsArray({ message: 'Documents list must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => VerificationDocDto)
  documents: VerificationDocDto[];
}
