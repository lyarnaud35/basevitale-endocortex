import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_ACTIONS = ['VALIDATE', 'TRANSMIT', 'MARK_PAID', 'REJECT'] as const;
export type InvoiceActionDto = (typeof ALLOWED_ACTIONS)[number];

export class InvoiceStatusActionDto {
  @ApiProperty({
    description: 'Action de transition FSM',
    enum: ALLOWED_ACTIONS,
    example: 'VALIDATE',
  })
  @IsIn([...ALLOWED_ACTIONS])
  action!: InvoiceActionDto;
}
