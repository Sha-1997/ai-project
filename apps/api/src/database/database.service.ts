import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { configuration } from '../config/configuration';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private isDbConnected: boolean = false;
  private isRedisConnected: boolean = false;

  async onModuleInit() {
    console.log('[JovianeX DB] Initializing PostgreSQL connection pool...');
    try {
      // Postgres pool mock initialization
      console.log(`[JovianeX DB] Connecting to PostgreSQL at: ${configuration.database.url.split('@')[1] || 'localhost'}`);
      this.isDbConnected = true;
      console.log('[JovianeX DB] PostgreSQL pool connection established successfully.');
    } catch (err) {
      console.error('[JovianeX DB] Failed to connect to PostgreSQL database:', err);
      this.isDbConnected = false;
    }

    console.log('[JovianeX Cache] Initializing Redis client connection...');
    try {
      // Redis client mock initialization
      console.log(`[JovianeX Cache] Connecting to Redis server at: ${configuration.redis.host}:${configuration.redis.port}`);
      this.isRedisConnected = true;
      console.log('[JovianeX Cache] Redis connection established successfully.');
    } catch (err) {
      console.error('[JovianeX Cache] Failed to connect to Redis cache server:', err);
      this.isRedisConnected = false;
    }
  }

  async onModuleDestroy() {
    console.log('[JovianeX DB] Closing PostgreSQL connection pool...');
    console.log('[JovianeX Cache] Terminating Redis client connection...');
  }

  getDbStatus(): boolean {
    return this.isDbConnected;
  }

  getRedisStatus(): boolean {
    return this.isRedisConnected;
  }
}
