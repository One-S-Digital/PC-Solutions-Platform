import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { STAFFING_PARSE_REQUEST_QUEUE } from '../queues/staffing-queues.module';
import { StaffingService } from '../staffing.service';

@Processor(STAFFING_PARSE_REQUEST_QUEUE)
export class StaffingParseProcessor {
  private readonly logger = new Logger(StaffingParseProcessor.name);

  constructor(private readonly staffingService: StaffingService) {}

  @Process()
  async handle(job: Job<{ staffingRequestId: string }>) {
    const { staffingRequestId } = job.data;
    this.logger.log(`Parsing staffing request ${staffingRequestId}`);
    await this.staffingService.parseRequest(staffingRequestId);
    await this.staffingService.enqueueMatchAndEmbed(staffingRequestId);
  }
}
