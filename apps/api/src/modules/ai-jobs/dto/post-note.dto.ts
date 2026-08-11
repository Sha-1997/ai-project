import { IsString, IsNotEmpty } from 'class-validator';

export class PostNoteDto {
  @IsString({ message: 'Internal comments content must be a text string.' })
  @IsNotEmpty({ message: 'Internal comments content is required.' })
  content: string;
}
