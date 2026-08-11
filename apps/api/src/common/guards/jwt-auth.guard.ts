import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as crypto from 'crypto';
import { configuration } from '../../config/configuration';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedPayload = this.verifyJwtToken(token, configuration.jwt.secret);
      request.user = decodedPayload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Session expired or token signature invalid.');
    }
  }

  /**
   * Helper verifying token signatures and parsing payloads
   */
  private verifyJwtToken(token: string, secret: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT segments count');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature match
    const verifySignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (verifySignature !== signatureB64) {
      throw new Error('Signature verification failed');
    }

    // Parse payload json
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Verify token expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }
}
