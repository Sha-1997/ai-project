import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CandidateLoginDto } from './dto/candidate-login.dto';
import { EmployerLoginDto } from './dto/employer-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendEmailOtpDto } from './dto/send-email-otp.dto';
import { SendMobileOtpDto } from './dto/send-mobile-otp.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ip, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('send-email-otp')
  @HttpCode(HttpStatus.OK)
  async sendEmailOtp(@Body() dto: SendEmailOtpDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.authService.sendEmailOtp(dto.email, ip, userAgent);
  }

  @Post('send-mobile-otp')
  @HttpCode(HttpStatus.OK)
  async sendMobileOtp(@Body() dto: SendMobileOtpDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    return this.authService.sendMobileOtp(dto.mobile, ip, userAgent);
  }

  @Post('candidate-login')
  @HttpCode(HttpStatus.OK)
  async candidateLogin(@Body() dto: CandidateLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    return this.authService.candidateLogin(dto, ipAddress, userAgent);
  }

  @Post('employer-login')
  @HttpCode(HttpStatus.OK)
  async employerLogin(@Body() dto: EmployerLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    return this.authService.employerLogin(dto, ipAddress, userAgent);
  }

  @Post('apple/login')
  async appleLogin(@Body() dto: { idToken: string }) {
    return this.authService.appleLogin(dto.idToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Req() expressReq: Request) {
    const accessToken = expressReq.headers['authorization']?.split(' ')[1] || '';
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.authService.logout(accessToken, ip, userAgent);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyEmail(dto.token, ip, userAgent);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.resendVerification(dto.email, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.rotateTokens(dto, ip, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.forgotPassword(dto, ip, userAgent);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPassword(dto, ip, userAgent);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
    @Req() expressReq: Request,
  ) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.authService.changePassword(userId, dto, ip, userAgent);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSessions(@Req() req: any) {
    const userId = req.user.sub;
    return this.authService.getSessions(userId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.authService.revokeSession(id, userId);
  }
}
