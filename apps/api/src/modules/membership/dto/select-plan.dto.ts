import { IsString, IsNotEmpty } from 'class-validator';

export class SelectPlanDto {
  @IsString({ message: 'Plan ID must be a text string.' })
  @IsNotEmpty({ message: 'Plan ID is required.' })
  planId: string;
}
