import { IsString, IsNotEmpty } from 'class-validator';

export class CheckoutDto {
  @IsString({ message: 'Order ID must be a text string.' })
  @IsNotEmpty({ message: 'Order ID is required.' })
  orderId: string;
}
