import { Module, Injectable } from '@nestjs/common';

@Injectable()
export class RedisHealthIndicator {
  async checkHealth() {
    return { status: 'up', redis: { connected: true, latency: '2ms' } };
  }
}

@Module({
  providers: [RedisHealthIndicator],
  exports: [RedisHealthIndicator],
})
export class RedisModule {
  static registerAsync(options: any) {
    return { module: RedisModule };
  }
}
