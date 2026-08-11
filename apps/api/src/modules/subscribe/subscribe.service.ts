import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class SubscribeService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
  }

  async subscribe(email: string) {
    const receiver = this.configService.get<string>('resend.email');

    // Send notification to admin
    await this.resend.emails.send({
      from: 'JovianeX AI Ecosystem  <info@jovianex.com>',

      to: 'info@jovianex.com',

      subject: 'New Newsletter Subscription',

      html: `
      <h2>New Subscriber</h2>
      <p>Email: ${email}</p>
    `,
    });

    // Send success email to subscriber
    await this.resend.emails.send({
      from: 'JovianeX AI Ecosystem <info@jovianex.com>',

      to: email,

      subject: 'Subscription Successful',

      html: `
      <h2>Thank you for subscribing 🎉</h2>

      <p>
        You have successfully subscribed to JovianeX updates.
      </p>

      <p>
        We will keep you updated with our latest news and announcements.
      </p>
    `,
    });

    return {
      success: true,
      message: 'Subscription successful',
    };
  }
}
