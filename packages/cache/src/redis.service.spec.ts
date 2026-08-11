import 'reflect-metadata';
import { RedisService } from './redis.service';

// Mock ioredis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue('test-value'),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      flushdb: jest.fn().mockResolvedValue('OK'),
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

describe('RedisService', () => {
  let service: RedisService;
  const mockOptions = { host: 'localhost', port: 6379 };

  beforeEach(() => {
    service = new RedisService(mockOptions);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call get correctly', async () => {
    const val = await service.get('key');
    expect(val).toBe('test-value');
  });

  it('should call set correctly', async () => {
    await service.set('key', 'value', 3600);
    expect(service.getClient().set).toHaveBeenCalledWith('key', 'value', 'EX', 3600);
  });

  it('should call delete correctly', async () => {
    const res = await service.delete('key');
    expect(res).toBe(1);
  });

  it('should call ping correctly', async () => {
    const res = await service.ping();
    expect(res).toBe('PONG');
  });
});
