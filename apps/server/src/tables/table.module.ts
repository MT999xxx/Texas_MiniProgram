import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { TableEntity } from './table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity])],
  providers: [TableService],
  controllers: [TableController],
  exports: [TableService],
})
export class TableModule {}
