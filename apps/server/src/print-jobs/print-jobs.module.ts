import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrintJobEntity } from './print-job.entity';
import { PrintJobsController } from './print-jobs.controller';
import { PrintJobsService } from './print-jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrintJobEntity])],
  controllers: [PrintJobsController],
  providers: [PrintJobsService],
  exports: [PrintJobsService],
})
export class PrintJobsModule {}
