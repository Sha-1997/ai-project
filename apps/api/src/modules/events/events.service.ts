import { Injectable, BadRequestException } from '@nestjs/common';
import { EcosystemEvent } from '../../common/types/event.types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EventsService {
  private listeners: ((event: EcosystemEvent) => void)[] = [];
  private readonly eventStorePath: string;

  constructor() {
    // Standard event store path (acts as the lightweight local Data Lake file cache)
    const baseDir = path.join(process.cwd(), '.data-lake');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.eventStorePath = path.join(baseDir, 'event_history.jsonl');
  }

  /**
   * Register a subscriber listener function
   */
  subscribe(listener: (event: EcosystemEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Validate and publish event to observers
   */
  async publish(event: EcosystemEvent) {
    // 1. Basic schema structure validation
    if (!event.eventId || !event.eventType || !event.version || !event.timestamp || !event.correlationId) {
      throw new BadRequestException('Invalid event payload structure metadata parameters.');
    }

    console.log(`[EventBus] Publishing event: ${event.eventType} (Version: ${event.version})`);

    // 2. Broadcast to observers
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`Error delivering event to listener:`, err);
      }
    });

    // 3. Append to SRE Data Lake asynchronously (non-blocking for production latency safety)
    const logLine = JSON.stringify(event) + '\n';
    fs.appendFile(this.eventStorePath, logLine, (err) => {
      if (err) {
        console.error('Failed to append event history to Data Lake:', err);
      }
    });

    return { success: true, eventId: event.eventId };
  }

  /**
   * Fetch event lake history metrics
   */
  async getStoredEventsCount(): Promise<number> {
    if (!fs.existsSync(this.eventStorePath)) return 0;
    try {
      const data = fs.readFileSync(this.eventStorePath, 'utf8');
      return data.trim().split('\n').filter(Boolean).length;
    } catch (e) {
      return 0;
    }
  }
}
