import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SreAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sreKey = request.headers['x-sre-key'];

    // 1. Authorize SRE scraping services with token
    if (sreKey === 'jovianex-sre-key-2026') {
      return true;
    }

    // 2. Fallback to check logged-in admin sessions
    const user = request.user;
    if (user && user.role === 'ADMIN') {
      return true;
    }

    throw new UnauthorizedException('Access denied. Valid SRE credentials required.');
  }
}
