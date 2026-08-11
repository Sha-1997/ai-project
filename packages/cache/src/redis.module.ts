import { Module, DynamicModule, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_OPTIONS } from './redis.constants';
import { RedisOptions } from './redis.types';
import { RedisHealthIndicator } from './redis.health';

export interface RedisModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<RedisOptions> | RedisOptions;
  inject?: any[];
}

@Global()
@Module({})
export class RedisModule {
  static register(options: RedisOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_OPTIONS,
          useValue: options,
        },
        RedisService,
        RedisHealthIndicator,
      ],
      exports: [RedisService, RedisHealthIndicator],
    };
  }

  static registerAsync(options: RedisModuleAsyncOptions): DynamicModule {
    return {
      module: RedisModule,
      imports: options.imports || [],
      providers: [
        {
          provide: REDIS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        RedisService,
        RedisHealthIndicator,
      ],
      exports: [RedisService, RedisHealthIndicator],
    };
  }
}
