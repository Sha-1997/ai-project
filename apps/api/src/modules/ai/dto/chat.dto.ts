import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000, { message: 'Prompt must be between 1 and 2000 characters.' })
  prompt: string;
}
