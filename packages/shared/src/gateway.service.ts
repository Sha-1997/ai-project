import { PrismaClient, ApiKey, WebhookSubscription, WebhookDeliveryLog } from "@prisma/client";
import * as crypto from "crypto";

export interface GatewayRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  ip: string;
  payload?: any;
}

export interface RouteResult {
  status: number;
  routedTo?: string;
  error?: string;
  userId?: string;
  scopes?: string[];
}

// 1. LIGHTWEIGHT API GATEWAY ROUTER (NO BUSINESS LOGIC INSIDE)
export class ApiGateway {
  private prisma: PrismaClient;
  // Simple in-memory tracker for rate limit demonstrations
  private rateLimitWindow: Record<string, { count: number; resetTime: number }> = {};

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * INCOMING REQUEST ROUTER AND VALIDATOR
   */
  async routeRequest(req: GatewayRequest): Promise<RouteResult> {
    // 1. Parse Versioning (Support v1, v2)
    const versionMatch = req.path.match(/^\/api\/(v1|v2)\//);
    if (!versionMatch) {
      return { status: 404, error: "Invalid API version route." };
    }
    const version = versionMatch[1];

    // 2. Resolve target service routing coordinates
    const route = this.resolveServiceRouting(req.path);
    if (!route) {
      return { status: 404, error: "Target service route not found." };
    }

    // 3. Resolve Authentication credentials
    let authResult: { userId: string; scopes: string[]; limitTps: number } | null = null;
    try {
      authResult = await this.authenticate(req.headers);
    } catch (err: any) {
      return { status: 401, error: err.message || "Authentication failed." };
    }

    // 4. Scope-based authorization validation
    const requiredScope = this.getRequiredScopeForMethod(req.method, req.path);
    if (requiredScope && !authResult.scopes.includes(requiredScope)) {
      return { status: 403, error: `Forbidden: Missing required scope "${requiredScope}"` };
    }

    // 5. Rate Limiting enforcement (Standard: API Keys = 5 TPS, JWT User = 20 TPS)
    const clientKey = authResult.userId || req.ip;
    const isRateLimited = this.checkRateLimit(clientKey, authResult.limitTps);
    if (isRateLimited) {
      return { status: 429, error: "Too Many Requests: Rate limit exceeded." };
    }

    return {
      status: 200,
      routedTo: `${route} (${version})`,
      userId: authResult.userId,
      scopes: authResult.scopes,
    };
  }

  // PRIVATE ROUTING HELPERS
  private resolveServiceRouting(path: string): string | null {
    if (path.includes("/jobs") || path.includes("/applications")) return "JobsService";
    if (path.includes("/notifications") || path.includes("/preferences")) return "NotificationService";
    if (path.includes("/search") || path.includes("/suggestions")) return "SearchService";
    if (path.includes("/cms") || path.includes("/pages")) return "CmsService";
    return null;
  }

  private async authenticate(headers: Record<string, string>): Promise<{ userId: string; scopes: string[]; limitTps: number }> {
    const authHeader = headers["authorization"];
    const apiKeyHeader = headers["x-api-key"];

    // 1. API Key Auth check
    if (apiKeyHeader) {
      const hash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");
      const keyRecord = await this.prisma.apiKey.findUnique({
        where: { keyHash: hash },
        include: { user: true },
      });

      if (!keyRecord || !keyRecord.isActive) {
        throw new Error("Invalid or deactivated API Key credentials.");
      }
      if (keyRecord.expiresAt < new Date()) {
        throw new Error("API Key has expired.");
      }

      const scopes = JSON.parse(keyRecord.scopesJson);
      return {
        userId: keyRecord.userId,
        scopes,
        limitTps: keyRecord.rateLimitTps,
      };
    }

    // 2. JWT auth check
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Simulate JWT verification payload check
      if (token === "invalid-mock-token") {
        throw new Error("Expired or invalid JWT verification token.");
      }

      // Return mock user parameters for validation
      return {
        userId: "mock-jwt-user-uuid",
        scopes: ["jobs:read", "applications:write", "notifications:read"],
        limitTps: 20, // Default JWT limit: 20 TPS
      };
    }

    throw new Error("Missing authorization credentials.");
  }

  private getRequiredScopeForMethod(method: string, path: string): string | null {
    const isWrite = ["POST", "PUT", "DELETE"].includes(method.toUpperCase());
    if (path.includes("/jobs")) return isWrite ? "jobs:write" : "jobs:read";
    if (path.includes("/applications")) return isWrite ? "applications:write" : "applications:read";
    return null;
  }

  private checkRateLimit(key: string, limitTps: number): boolean {
    const now = Date.now();
    const window = this.rateLimitWindow[key];

    if (!window || now > window.resetTime) {
      this.rateLimitWindow[key] = {
        count: 1,
        resetTime: now + 1000, // 1 second sliding frame
      };
      return false;
    }

    if (window.count >= limitTps) {
      return true;
    }

    window.count++;
    return false;
  }
}

// 2. ENTERPRISE WEBHOOK INTEGRATION PLATFORM
export class WebhookService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * REGISTER NEW WEBHOOK SUBSCRIPTION (GENERATES HMAC VERIFICATION SECRET)
   */
  async registerSubscription(url: string, eventTypes: string[]): Promise<WebhookSubscription> {
    const secret = crypto.randomBytes(32).toString("hex");
    return this.prisma.webhookSubscription.create({
      data: {
        url,
        secret,
        eventTypesJson: JSON.stringify(eventTypes),
        isActive: true,
      },
    });
  }

  /**
   * DISPATCH PAYLOAD TO SUBSCRIBED WEBHOOKS WITH HMAC-SHA256 SIGNATURE
   */
  async dispatchWebhookEvent(eventType: string, payload: Record<string, any>): Promise<WebhookDeliveryLog[]> {
    const activeSubs = await this.prisma.webhookSubscription.findMany({
      where: { isActive: true },
    });

    const logs: WebhookDeliveryLog[] = [];

    for (const sub of activeSubs) {
      const allowedEvents: string[] = JSON.parse(sub.eventTypesJson);
      if (!allowedEvents.includes(eventType)) continue;

      const payloadStr = JSON.stringify(payload);
      // Cryptographic signature verification: HMAC SHA-256
      const signature = crypto
        .createHmac("sha256", sub.secret)
        .update(payloadStr)
        .digest("hex");

      let status = "SUCCESS";
      let code = 200;
      let errorMsg: string | null = null;

      try {
        await this.mockPostEndpoint(sub.url, payloadStr, signature);
      } catch (err: any) {
        status = "FAILED";
        code = 500;
        errorMsg = err.message || "Gateway client checkout timeout.";
      }

      const log = await this.prisma.webhookDeliveryLog.create({
        data: {
          subscriptionId: sub.id,
          eventId: crypto.randomUUID(),
          payloadJson: payloadStr,
          status,
          responseCode: code,
          attempts: 1,
          lastError: errorMsg,
        },
      });

      logs.push(log);
    }

    return logs;
  }

  // PRIVATE MOCKS
  private async mockPostEndpoint(url: string, payload: string, signature: string): Promise<void> {
    console.log(`[WebhookService] Sending webhook request to ${url}...`);
    console.log(`[WebhookService] Verification Header [x-jovianex-signature]: ${signature}`);
    // Random 10% dropout simulation
    if (Math.random() < 0.1) {
      throw new Error("Simulated webhooks dispatch network dropout.");
    }
  }
}
