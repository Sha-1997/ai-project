import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal database transaction invoice generator
   */
  async generateInvoiceInternal(
    tx: any,
    orderId: string,
    userId: string,
    founderId: string,
    amount: number,
    currency: string,
  ) {
    const count = await tx.invoice.count();
    const serial = String(count + 1).padStart(6, '0');
    const invoiceNumber = `JXI-2026-${serial}`;

    const invoice = await tx.invoice.create({
      data: {
        orderId,
        userId,
        invoiceNumber,
        founderId,
        amount,
        currency,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    console.log(`[JovianeX Invoices] Invoice generated successfully: ${invoiceNumber}`);
    return invoice;
  }

  /**
   * Fetch invoice details by ID
   */
  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.userId !== userId) {
      throw new BadRequestException('Unauthorized access to invoice details.');
    }

    return invoice;
  }
}
