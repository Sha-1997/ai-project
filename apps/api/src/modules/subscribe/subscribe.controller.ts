import { Body, Controller, Post } from '@nestjs/common';
import { SubscribeService } from './subscribe.service';


@Controller('subscribe')
export class SubscribeController {

  constructor(
    private readonly subscribeService: SubscribeService
  ) {}


  @Post()
  async create(
    @Body() body: { email: string }
  ) {

    return this.subscribeService.subscribe(
      body.email
    );

  }
}