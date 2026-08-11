import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly redisService: RedisService) {}

  async checkHealth() {
    const startTime = Date.now();
    try {
      const pingResult = await this.redisService.ping();
      const latency = `${Date.now() - startTime}ms`;
      const isHealthy = pingResult === 'PONG';
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        redis: {
          connected: isHealthy,
          latency,
        },
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        redis: {
          connected: false,
          error: (err as any).message,
        },
      };
    }
  }
}
