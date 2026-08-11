import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getResume(@Req() req: any) {
    const userId = req.user.sub;
    return this.resumeService.getResume(userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async updateResume(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    return this.resumeService.updateResume(userId, body);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadResume(@Req() req: any, @Body('resumeText') resumeText?: string) {
    const userId = req.user.sub;
    return this.resumeService.parseAndFillResume(userId, resumeText);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Req() req: any, @Body('jobDescription') jobDescription: string) {
    const userId = req.user.sub;
    return this.resumeService.analyzeAtsScore(userId, jobDescription);
  }

  @Post('improve')
  @HttpCode(HttpStatus.OK)
  async improve(@Req() req: any) {
    const userId = req.user.sub;
    return this.resumeService.getOptimizeSuggestions(userId);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  async exportResume(@Req() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const resume = await this.resumeService.getResume(userId);
    const buffer = this.resumeService.exportResumePdf(resume);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=resume.pdf',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
