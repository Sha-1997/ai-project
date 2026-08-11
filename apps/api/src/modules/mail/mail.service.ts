import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {

  private resend = new Resend(
    process.env.RESEND_API_KEY,
  );


  async sendOtpEmail(
    email: string,
    otp: string,
  ) {

    await this.resend.emails.send({

      from: 'JovianeX <no-reply@jovianex.com>',

      to: email,

      subject: 'Your C Login OTP',

      html: `
        <div>
          <h2>JovianeX  Login</h2>

          <p>Your OTP is:</p>

          <h1>${otp}</h1>

          <p>
            This OTP expires in 5 minutes.
          </p>

        </div>
      `,
    });

  }

}