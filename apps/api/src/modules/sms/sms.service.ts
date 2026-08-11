import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {

  private readonly logger = new Logger(SmsService.name);

  private client: Twilio | null = null;


  constructor() {

    const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();


    this.logger.log(
      `SMS PROVIDER: ${provider}`,
    );


    if (provider === 'twilio') {

      if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN
      ) {
        throw new Error(
          'Twilio credentials missing',
        );
      }


      this.client = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      this.logger.log(
        'Twilio initialized successfully',
      );

    }

  }



  async sendOtp(
    mobile: string,
    otp: string,
  ) {


    const provider =
      process.env.SMS_PROVIDER
      ?.trim()
      .toLowerCase();



    // Development mode

    if(provider === 'mock') {

      this.logger.log(
        `DEV OTP ${mobile}: ${otp}`,
      );

      return true;

    }



    // Twilio mode

    if(provider === 'twilio') {


      if(!this.client) {

        throw new Error(
          'Twilio client not initialized',
        );

      }



      await this.client.messages.create({

        body:
          `Your JovianeX OTP is ${otp}`,

        from:
          process.env.TWILIO_PHONE_NUMBER,

        to:
          mobile,

      });


      return true;

    }



    throw new Error(
      'Invalid SMS provider configuration',
    );

  }

}