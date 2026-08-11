import 'reflect-metadata';
import { RedisHealthIndicator } from './redis.health';
import { RedisService } from './redis.service';

describe('RedisHealthIndicator', () => {
  let healthIndicator: RedisHealthIndicator;
  let mockRedisService: any;

  beforeEach(() => {
    mockRedisService = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    healthIndicator = new RedisHealthIndicator(mockRedisService);
  });

  it('should return healthy status when ping resolves PONG', async () => {
    const res = await healthIndicator.checkHealth();
    expect(res.status).toBe('healthy');
    expect(res.redis.connected).toBe(true);
  });

  it('should return unhealthy status when ping fails', async () => {
    mockRedisService.ping.mockRejectedValue(new Error('Connection timed out'));
    const res = await healthIndicator.checkHealth();
    expect(res.status).toBe('unhealthy');
    expect(res.redis.connected).toBe(false);
  });
});
