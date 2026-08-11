import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString({ message: 'Saved search name must be a valid text string.' })
  @IsNotEmpty({ message: 'Saved search name is required.' })
  name: string;

  @IsObject({ message: 'Search criteria parameters must be a valid key-value object.' })
  @IsNotEmpty({ message: 'Search criteria parameters are required.' })
  criteria: any;
}
