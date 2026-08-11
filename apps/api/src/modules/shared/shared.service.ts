import { Injectable } from '@nestjs/common';

@Injectable()
export class SharedService {
  formatDate(date: Date): string {
    return date.toISOString();
  }

  generateCorrelationId(): string {
    return `cor-${Math.random().toString(36).substr(2, 9)}`;
  }
}
