import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentService {
  constructor(private readonly configService: ConfigService) {}

  get(key: string): string {
    return this.configService.get<string>(key);
  }

  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  getPort(): number {
    return parseInt(this.get('PORT') || '3000', 10);
  }
}
