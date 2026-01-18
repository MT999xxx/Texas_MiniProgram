import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { TableEntity } from './table.entity';
// 暂时禁用 - 依赖 @nestjs/schedule，需要 Node 20+
// import { TableResetTask } from './table-reset.task';
import { ReservationModule } from '../reservation/reservation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TableEntity]),
    forwardRef(() => ReservationModule),
  ],
  providers: [TableService], // TableResetTask 暂时禁用
  controllers: [TableController],
  exports: [TableService],
})
export class TableModule { }
