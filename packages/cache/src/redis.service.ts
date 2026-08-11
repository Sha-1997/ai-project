import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_OPTIONS } from './redis.constants';
import { RedisOptions } from './redis.types';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(@Inject(REDIS_OPTIONS) private readonly options: RedisOptions) {
    const redisUrl = this.options.tls
      ? `rediss://${this.options.username ? `${this.options.username}:${this.options.password}@` : ''}${this.options.host}:${this.options.port}`
      : `redis://${this.options.username ? `${this.options.username}:${this.options.password}@` : ''}${this.options.host}:${this.options.port}`;

    this.client = new Redis(redisUrl, {
      db: this.options.db || 0,
      retryStrategy: (times) => {
        // Retry logic: reconnect after delay increasing up to 3 seconds
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on('error', (err) => {
      console.error('[JovianeX Cache] Redis Client Connection Error:', err);
    });

    this.client.on('connect', () => {
      console.log('[JovianeX Cache] Redis Client connected successfully.');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decrement(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async flush(): Promise<string> {
    return this.client.flushdb();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy() {
    console.log('[JovianeX Cache] Gracefully shutting down Redis connection...');
    await this.client.quit();
  }
}
