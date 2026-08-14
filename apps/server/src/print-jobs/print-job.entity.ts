import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PrintJobStatus {
  PENDING = 'PENDING',
  PRINTING = 'PRINTING',
  PRINTED = 'PRINTED',
  FAILED = 'FAILED',
}

export type ReceiptPrintPayload = {
  orderId: string;
  orderNumber: string;
  tableName: string;
  memberName?: string;
  paymentMethod: string;
  originalAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  paidAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    specType?: string;
  }>;
};

@Entity('print_jobs')
@Index('IDX_print_jobs_status_created', ['status', 'createdAt'])
export class PrintJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', length: 36, unique: true })
  orderId!: string;

  @Column({ type: 'enum', enum: PrintJobStatus, default: PrintJobStatus.PENDING })
  status!: PrintJobStatus;

  @Column({ type: 'simple-json' })
  payload!: ReceiptPrintPayload;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'claimed_at', nullable: true })
  claimedAt?: Date;

  @Column({ name: 'printed_at', nullable: true })
  printedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
