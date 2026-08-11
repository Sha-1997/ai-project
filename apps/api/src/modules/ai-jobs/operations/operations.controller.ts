import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SreAuthGuard } from '../../../common/guards/sre-auth.guard';

@Controller('sre')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    return this.operationsService.getHealthStatus();
  }

  @Get('telemetry')
  @UseGuards(JwtAuthGuard, SreAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTelemetry() {
    return this.operationsService.getSystemTelemetry();
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard, SreAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlerts() {
    return this.operationsService.getAlertLogs();
  }

  @Post('log')
  @UseGuards(JwtAuthGuard, SreAuthGuard)
  @HttpCode(HttpStatus.OK)
  async postSreLog(
    @Body('severity') severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    @Body('message') message: string,
    @Body('correlationId') correlationId: string,
    @Body('requestId') requestId: string,
  ) {
    return this.operationsService.logSreEvent(
      severity || 'INFO',
      message || 'Testing structured log format.',
      correlationId || 'corr-test-uuid',
      requestId || 'req-test-uuid',
    );
  }
}
