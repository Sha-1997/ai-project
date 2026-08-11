import { Controller, Get, Param, UseGuards, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getInvoice(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.invoicesService.getInvoiceById(id, userId);
  }
}
