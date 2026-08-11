import {
  Controller,
  Get,
  Put,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Body,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import { CareerService } from './career.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UpdateResumeDto } from './dto/update-resume.dto';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../../../common/upload/upload.config';


@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {

  constructor(
    private readonly careerService: CareerService,
  ) {}


  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Req() req:any){

    return this.careerService.getDashboardSummary(
      req.user.sub
    );

  }


  @Get('resume')
  async getResume(@Req() req:any){

    return this.careerService.getResume(
      req.user.sub
    );

  }



  @Put('resume')
  @UseInterceptors(
  FileFieldsInterceptor(
    [
      {
        name:'resumeFile',
        maxCount:1,
      },
      {
        name:'profilePhoto',
        maxCount:1,
      },
      {
        name:'certificates',
        maxCount:5,
      },
    ],
    multerConfig,
  ),
  )
  async updateResume(

    @Req() req:any,

    @Body() body:any,


    @UploadedFiles()
    files:{
      resumeFile?:Express.Multer.File[];
      profilePhoto?:Express.Multer.File[];
      certificates?:Express.Multer.File[];
    }

  ){


    const userId=req.user.sub;


    const dto:UpdateResumeDto =
      JSON.parse(body.resumeData);



    return {

      success:true,

      message:
      'Resume updated successfully',


      data:
      await this.careerService.updateResume(
        userId,
        dto,
        files
      )

    };


  }

}