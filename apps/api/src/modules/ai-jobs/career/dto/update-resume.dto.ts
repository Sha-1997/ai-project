import {
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';


export class UpdateResumeDto {

  @IsOptional()
  @IsString()
  headline?: string;


  @IsOptional()
  @IsString()
  careerSummary?: string;


  @IsOptional()
  @IsString()
  currentLocation?: string;


  @IsOptional()
  @IsString()
  preferredLocation?: string;


  @IsOptional()
  @IsArray()
  skills?: string[];


  @IsOptional()
  @IsArray()
  experiences?: any[];


  @IsOptional()
  @IsArray()
  educations?: any[];

}