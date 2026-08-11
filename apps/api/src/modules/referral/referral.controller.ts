import { Controller, Get, Post, Param, Query } from '@nestjs/common';

@Controller('referral')
export class ReferralController {
  @Get('stats/:userId')
  async getReferralStats(@Param('userId') userId: string) {
    return {
      userId,
      referralCode: 'JVX-FOUNDER-1024',
      referralLink: 'https://jovianex.com/register?ref=JVX-FOUNDER-1024',
      totalInvites: 8,
      qualifiedInvites: 5,
      progressTarget: 10,
      rewardStatus: 'Ambassador Silver',
    };
  }

  @Post('claim-reward')
  async claimReward() {
    return {
      success: true,
      message: 'Referral milestone rewards claimed. Tokens will be minted in subsequent tasks.',
      transactionHash: '0xmocktransactionhash',
    };
  }
}
