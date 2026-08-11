import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

describe('MembershipController', () => {
  let controller: MembershipController;
  let mockMembershipService: any;

  beforeEach(async () => {
    mockMembershipService = {
      getPlans: jest.fn().mockResolvedValue([
        { id: 'plan-1', code: 'BASIC', name: 'Basic Plan', price: 0 },
        { id: 'plan-2', code: 'PREMIUM', name: 'Premium Plan', price: 999 },
      ]),
      getCurrentSubscription: jest.fn().mockResolvedValue({
        id: 'subscription-1',
        planId: 'plan-2',
        status: 'ACTIVE',
      }),
      selectPlan: jest.fn().mockResolvedValue({
        success: true,
        orderId: 'order-1',
        checkoutUrl: 'http://stripe.com/checkout/order-1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [
        {
          provide: MembershipService,
          useValue: mockMembershipService,
        },
      ],
    }).compile();

    controller = module.get<MembershipController>(MembershipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return plans correctly', async () => {
    const plans = await controller.getPlans();
    expect(mockMembershipService.getPlans).toHaveBeenCalled();
    expect(plans.length).toBe(2);
    expect(plans[1].code).toBe('PREMIUM');
  });

  it('should return current subscription correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const sub = await controller.getCurrentSubscription(req);
    expect(mockMembershipService.getCurrentSubscription).toHaveBeenCalledWith('user-1');
    expect(sub.status).toBe('ACTIVE');
  });
});
