import { Module, Global } from '@nestjs/common';
import { SharedService } from './shared.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [SharedService, AuditService],
  exports: [SharedService, AuditService],
})
export class SharedModule {}
