import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Handle chatbot prompt interactions
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  async handleChat(@Req() req: any, @Body() dto: ChatDto) {
    const userId = req.user.sub;
    return this.aiService.processPrompt(userId, dto.prompt);
  }
}
