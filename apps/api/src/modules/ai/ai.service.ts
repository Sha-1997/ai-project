import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { configuration } from '../../config/configuration';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

@Injectable()
export class AiService {
  private redisClient: Redis | null = null;
  private fallbackMemory: Map<string, string[]> = new Map();

  constructor(private readonly prisma: PrismaService) {
    try {
      this.redisClient = new Redis({
        host: configuration.redis.host,
        port: configuration.redis.port,
        maxRetriesPerRequest: 1,
      });
      this.redisClient.on('error', () => {
        // Suppress logs to keep terminal quiet, fallback gracefully
        this.redisClient = null;
      });
    } catch {
      this.redisClient = null;
    }
  }

  /**
   * Process incoming prompts, handle intent classification, and sync session states
   */
  async processPrompt(userId: string, prompt: string) {
    // 1. Throttling Rate Limiting check
    await this.checkRateLimit(userId);

    // 2. Fetch profile contextual clues to personalize reply
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const userName = user?.profile?.fullName || 'Valued User';

    // 3. Retrieve chat transcripts history
    const history = await this.getSessionHistory(userId);
    history.push(`User: ${prompt}`);

    // 4. Intent Classification Router
    const lowerPrompt = prompt.toLowerCase();
    let capabilityCode: string | null = null;
    let reply = '';

    if (lowerPrompt.includes('job') || lowerPrompt.includes('career') || lowerPrompt.includes('resume') || lowerPrompt.includes('ats')) {
      capabilityCode = 'career:jobs:view';
      reply = `Hello ${userName}, I recognize that you are inquiring about jobs or resume profiles. I have resolved your request to the Career module and triggered the AI Jobs dashboard overlay to slide open. How can I help you refine your ATS score?`;
    } else if (lowerPrompt.includes('billing') || lowerPrompt.includes('invoice') || lowerPrompt.includes('pricing') || lowerPrompt.includes('payment')) {
      capabilityCode = 'finance:invoices:view';
      reply = `Understood ${userName}. Checking your subscription billing history and active plans status. Resolving this intent to the Finance module and launching the Invoices overlay.`;
    } else if (lowerPrompt.includes('profile') || lowerPrompt.includes('password') || lowerPrompt.includes('settings')) {
      capabilityCode = 'identity:profile:write';
      reply = `Routing you to the profile settings configuration. I've resolved this action to the identity module where you can modify details or track active device sessions.`;
    } else {
      // General conversational LLM reply simulation
      reply = `Hello ${userName}, I am your JovianeX AI Assistant. I can help you search jobs, review resumes, or check invoices. Try saying "Find a job" or "Show my billing details".`;
    }

    history.push(`Assistant: ${reply}`);

    // 5. Commit history back to cache
    await this.saveSessionHistory(userId, history);

    return {
      success: true,
      reply,
      capabilityCode,
      logsCount: history.length,
    };
  }

  /**
   * Limit user prompts count to prevent server abuse
   */
  private async checkRateLimit(userId: string) {
    const limitKey = `ratelimit:${userId}`;
    if (this.redisClient) {
      try {
        const count = await this.redisClient.incr(limitKey);
        if (count === 1) {
          await this.redisClient.expire(limitKey, 60);
        }
        if (count > 20) {
          throw new BadRequestException('Too many requests. Please wait 1 minute.');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
      }
    }
  }

  /**
   * Load messages history from Redis or in-memory map
   */
  private async getSessionHistory(userId: string): Promise<string[]> {
    const cacheKey = `chat:history:${userId}`;
    if (this.redisClient) {
      try {
        const list = await this.redisClient.lrange(cacheKey, 0, -1);
        if (list && list.length > 0) return list;
      } catch {}
    }
    return this.fallbackMemory.get(userId) || [];
  }

  /**
   * Save messages history
   */
  private async saveSessionHistory(userId: string, history: string[]): Promise<void> {
    const cacheKey = `chat:history:${userId}`;
    if (this.redisClient) {
      try {
        await this.redisClient.del(cacheKey);
        await this.redisClient.rpush(cacheKey, ...history);
        await this.redisClient.expire(cacheKey, 3600); // 1 Hour session life
        return;
      } catch {}
    }
    this.fallbackMemory.set(userId, history.slice(-20)); // Limit to last 20 messages
  }
}
