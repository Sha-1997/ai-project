import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Req() req: any,
    @Body() dto: CheckoutDto,
    @Req() expressReq: Request,
  ) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.paymentsService.createCheckoutSession(userId, dto, ip, userAgent);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.paymentsService.handleWebhook(payload, signature, ip, userAgent);
  }
}
