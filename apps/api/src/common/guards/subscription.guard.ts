import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User authentication details not found in session.');
    }

    const subscription = await this.prisma.membershipSubscription.findUnique({
      where: { userId: user.sub },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'An active premium membership is required to access this resource.',
      );
    }

    return true;
  }
}
