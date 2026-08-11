import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('[JovianeX DB] Prisma connecting to PostgreSQL database...');
    await this.$connect();
    console.log('[JovianeX DB] Prisma connected successfully.');
  }

  async onModuleDestroy() {
    console.log('[JovianeX DB] Prisma disconnecting from PostgreSQL...');
    await this.$disconnect();
  }
}
