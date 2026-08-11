import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SubmitEntryDto {
  @IsString({ message: 'Proposed name must be a text string.' })
  @IsNotEmpty({ message: 'Proposed name is required.' })
  @Length(2, 100, { message: 'Proposed name must be between 2 and 100 characters long.' })
  proposedName: string;

  @IsString({ message: 'Explanation must be a text string.' })
  @IsNotEmpty({ message: 'Explanation is required.' })
  @Length(10, 1000, { message: 'Explanation must be between 10 and 1000 characters long.' })
  explanation: string;
}
