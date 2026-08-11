import { Controller, Get, Patch, Body, UseGuards, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: any) {
    const userId = req.user.sub;
    return this.usersService.getProfile(userId);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto, @Req() expressReq: Request) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.usersService.updateProfile(userId, dto, ip, userAgent);
  }
  
  @Public()
  @Get('count')
  @HttpCode(HttpStatus.OK)
  async getUserCount() {
    return this.usersService.getUserCount();
  }
}
