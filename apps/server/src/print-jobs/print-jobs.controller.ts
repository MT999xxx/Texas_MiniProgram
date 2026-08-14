import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PrintJobsService } from './print-jobs.service';

@Controller('print-jobs')
export class PrintJobsController {
  constructor(private readonly printJobsService: PrintJobsService) {}

  @Get('next')
  next(@Headers('x-print-agent-token') token?: string) {
    this.printJobsService.validateAgentToken(token);
    return this.printJobsService.claimNext();
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Headers('x-print-agent-token') token?: string,
  ) {
    this.printJobsService.validateAgentToken(token);
    return this.printJobsService.complete(id);
  }

  @Post(':id/fail')
  fail(
    @Param('id') id: string,
    @Body('error') error?: string,
    @Headers('x-print-agent-token') token?: string,
  ) {
    this.printJobsService.validateAgentToken(token);
    return this.printJobsService.fail(id, error);
  }

  @Post(':id/requeue')
  requeue(
    @Param('id') id: string,
    @Headers('x-print-agent-token') token?: string,
  ) {
    this.printJobsService.validateAgentToken(token);
    return this.printJobsService.requeue(id);
  }
}
