import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';
import { AppleService } from '../apple/apple.service';

@Module({
  imports: [MailModule,SmsModule],
  controllers: [AuthController],
  providers: [AuthService,AppleService],
  exports: [AuthService,AppleService],
})
export class AuthModule {}
