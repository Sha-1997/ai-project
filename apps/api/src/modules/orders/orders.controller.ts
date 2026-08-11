import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { Request } from 'express';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Req() req: any,
    @Body() dto: CreateOrderDto,
    @Req() expressReq: Request,
  ) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.ordersService.createOrder(userId, dto, ip, userAgent);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.ordersService.getOrderById(id, userId);
  }
}
