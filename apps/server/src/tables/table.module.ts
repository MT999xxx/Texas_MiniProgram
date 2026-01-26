import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { TableEntity } from './table.entity';
import { TableResetTask } from './table-reset.task';
import { ReservationModule } from '../reservation/reservation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TableEntity]),
    forwardRef(() => ReservationModule),
  ],
  providers: [TableService, TableResetTask],
  controllers: [TableController],
  exports: [TableService],
})
export class TableModule { }

