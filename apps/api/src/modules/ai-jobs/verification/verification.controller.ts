import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SubmitVerificationDto } from '../dto/submit-verification.dto';
import { ReviewVerificationDto } from '../dto/review-verification.dto';

@Controller()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('organizations/:id/verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitVerification(
    @Req() req: any,
    @Param('id') organizationId: string,
    @Body() dto: SubmitVerificationDto,
  ) {
    const userId = req.user.sub;
    return this.verificationService.submitVerification(userId, organizationId, dto);
  }

  @Get('organizations/:id/verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getVerification(
    @Req() req: any,
    @Param('id') organizationId: string,
  ) {
    const userId = req.user.sub;
    return this.verificationService.getVerification(userId, organizationId);
  }

  @Patch('admin/verification/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async adminReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    const adminUserId = req.user.sub;
    return this.verificationService.adminReviewVerification(adminUserId, id, dto);
  }

  @Get('admin/verifications')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async adminList() {
    return this.verificationService.adminGetVerifications();
  }
}
