import { PrismaClient, EventLog, NotificationTemplate, NotificationLog, NotificationPreference } from "@prisma/client";
import { EventEmitter } from "events";
import * as crypto from "crypto";

export interface EapEvent {
  eventId: string;
  eventType: string;
  sourceService: string;
  correlationId: string;
  payload: Record<string, any>;
  timestamp: Date;
}

// 1. DECOUPLED EVENT BUS messaging broker
export class EventBus extends EventEmitter {
  private prisma: PrismaClient;
  private static instance: EventBus;

  private constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || new PrismaClient();
  }

  public static getInstance(prismaClient?: PrismaClient): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(prismaClient);
    }
    return EventBus.instance;
  }

  /**
   * PUBLISH SYSTEM EVENT (PERSISTS TO EVENT LOG AND TRIGGERS SUBSCRIBERS)
   */
  async publish(
    eventType: string,
    sourceService: string,
    payload: Record<string, any>,
    correlationId?: string
  ): Promise<EventLog> {
    const eventId = crypto.randomUUID();
    const corrId = correlationId || crypto.randomUUID();
    const payloadStr = JSON.stringify(payload);

    // Save event to immutable EventLog table
    const log = await this.prisma.eventLog.create({
      data: {
        eventId,
        eventType,
        sourceService,
        correlationId: corrId,
        payloadJson: payloadStr,
        status: "PENDING",
        attempts: 1,
      },
    });

    try {
      console.log(`[EventBus] Dispatching event "${eventType}" with correlation ID: ${corrId}`);
      
      const eventPayload: EapEvent = {
        eventId,
        eventType,
        sourceService,
        correlationId: corrId,
        payload,
        timestamp: new Date(),
      };

      // Emit event to local memory listeners
      this.emit(eventType, eventPayload);

      // Update status to processed
      await this.prisma.eventLog.update({
        where: { id: log.id },
        data: { status: "PROCESSED" },
      });
    } catch (err: any) {
      await this.prisma.eventLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          attempts: log.attempts + 1,
        },
      });
      console.error(`[EventBus] Dispatch failed for event ${eventId}: ${err.message}`);
    }

    return log;
  }

  /**
   * SUBSCRIBE TO SYSTEM EVENTS
   */
  public subscribe(eventType: string, handler: (event: EapEvent) => void): void {
    console.log(`[EventBus] Subscriber registered for Event Type: "${eventType}"`);
    this.on(eventType, handler);
  }

  /**
   * EVENT REPLAY FOR SYSTEM DEBUGGING AND RECOVERY
   */
  async replayEvents(eventTypes: string[], startDate: Date): Promise<number> {
    const historicalLogs = await this.prisma.eventLog.findMany({
      where: {
        eventType: { in: eventTypes },
        createdAt: { gte: startDate },
        status: "PROCESSED",
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`[EventBus] Replaying ${historicalLogs.length} events logged since ${startDate.toISOString()}`);
    
    for (const log of historicalLogs) {
      const payloadObj = JSON.parse(log.payloadJson);
      // Re-publish the events, keeping original correlation ID
      await this.publish(log.eventType, log.sourceService, payloadObj, log.correlationId);
    }

    return historicalLogs.length;
  }
}

// 2. DECOUPLED NOTIFICATION PLATFORM (SUBSCRIBE TO BUS AND ROUTE COMMUNICATIONS)
export class NotificationPlatform {
  private prisma: PrismaClient;
  private eventBus: EventBus;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.eventBus = EventBus.getInstance(this.prisma);
    this.registerEventSubscriptions();
  }

  /**
   * REGISTER SYSTEM SUBSCRIBERS
   */
  private registerEventSubscriptions(): void {
    // 1. User registrations
    this.eventBus.subscribe("UserRegistered", async (event) => {
      await this.dispatchTemplateNotification(event.payload.userId, "Welcome", event.payload);
    });

    // 2. Payment approvals
    this.eventBus.subscribe("PaymentSuccessful", async (event) => {
      await this.dispatchTemplateNotification(event.payload.userId, "PaymentSuccess", event.payload);
    });

    // 3. Application submissions
    this.eventBus.subscribe("ApplicationSubmitted", async (event) => {
      await this.dispatchTemplateNotification(event.payload.userId, "JobApplicationReceived", event.payload);
    });
  }

  /**
   * INTERNAL DISPATCH ENGINE (INSPECT USER PREFERENCES & RESOLVE DYNAMIC TEMPLATE)
   * PM strategic recommendation: templates are stored in DB/CMS instead of hardcoded.
   */
  async dispatchTemplateNotification(
    userId: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<NotificationLog[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.warn(`[NotificationPlatform] User details not found: ${userId}`);
      return [];
    }

    // Resolve template from database settings
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { name: templateName },
    });
    if (!template || !template.isActive) {
      console.warn(`[NotificationPlatform] Active template "${templateName}" not found in database.`);
      return [];
    }

    const category = this.getCategoryFromTemplateName(templateName);

    // Fetch user preferences
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId_categoryName: { userId, categoryName: category } },
    });

    const targetChannels: string[] = [];
    if (template.isEmail && (!preferences || preferences.emailEnabled)) {
      targetChannels.push("EMAIL");
    }
    if (template.isSMS && preferences?.smsEnabled) {
      targetChannels.push("SMS");
    }
    if (template.isPush && preferences?.pushEnabled) {
      targetChannels.push("PUSH");
    }
    if (template.isInApp && (!preferences || preferences.inAppEnabled)) {
      targetChannels.push("IN_APP");
    }

    const logs: NotificationLog[] = [];

    for (const channel of targetChannels) {
      const subject = this.parseVariables(template.subjectTemplate, variables);
      const body = this.parseVariables(template.bodyTemplate, variables);
      const recipient = this.getRecipientDetails(user, channel);

      let status = "SENT";
      let error: string | null = null;

      try {
        await this.simulateMockSend(channel, recipient, body);
      } catch (err: any) {
        status = "FAILED";
        error = err.message || "Adapter timeout.";
      }

      const log = await this.prisma.notificationLog.create({
        data: {
          userId,
          recipient,
          channel,
          subject,
          body,
          status,
          attemptsCount: 1,
          lastError: error,
          templateId: template.id,
        },
      });

      logs.push(log);
    }

    return logs;
  }

  /**
   * PROCESS FAILED RETRY QUEUES (MAX 3 ATTEMPTS)
   */
  async processFailedCommunicationsQueue(): Promise<number> {
    const failedLogs = await this.prisma.notificationLog.findMany({
      where: {
        status: { in: ["FAILED", "RETRYING"] },
        attemptsCount: { lt: 3 },
      },
    });

    let updatedCount = 0;
    for (const log of failedLogs) {
      let status = "SENT";
      let error: string | null = null;

      try {
        await this.simulateMockSend(log.channel, log.recipient, log.body);
      } catch (err: any) {
        status = log.attemptsCount + 1 >= 3 ? "FAILED" : "RETRYING";
        error = err.message || "Simulated retry error.";
      }

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status,
          attemptsCount: log.attemptsCount + 1,
          lastError: error,
        },
      });

      updatedCount++;
    }

    return updatedCount;
  }

  // PRIVATE HELPERS
  private parseVariables(templateText: string, variables: Record<string, string>): string {
    let output = templateText;
    for (const [key, val] of Object.entries(variables)) {
      output = output.replace(new RegExp(`{{${key}}}`, "g"), val);
    }
    return output;
  }

  private getCategoryFromTemplateName(name: string): string {
    if (name.startsWith("Welcome") || name.startsWith("Job")) return "JOBS";
    if (name.startsWith("Payment")) return "BILLING";
    return "SECURITY";
  }

  private getRecipientDetails(user: any, channel: string): string {
    if (channel === "EMAIL") return user.email;
    if (channel === "SMS") return user.mobile || "MOCK_PHONE_NUMBER";
    return `device_push_token_for_${user.id}`;
  }

  private async simulateMockSend(channel: string, recipient: string, body: string): Promise<void> {
    console.log(`[NotificationPlatform] [${channel}] Dispatching message to ${recipient}...`);
    // Random 10% dropout simulations
    if (Math.random() < 0.1) {
      throw new Error("Simulated carrier adapter network timeout.");
    }
  }
}
