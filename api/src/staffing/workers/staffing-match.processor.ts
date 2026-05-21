import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { STAFFING_MATCH_QUEUE } from '../queues/staffing-queues.module';
import { StaffingService } from '../staffing.service';

@Processor(STAFFING_MATCH_QUEUE)
export class StaffingMatchProcessor {
  private readonly logger = new Logger(StaffingMatchProcessor.name);

  constructor(private readonly staffingService: StaffingService) {}

  @Process()
  async handle(job: Job<{ staffingRequestId: string }>) {
    this.logger.log(`Processing match job for request ${job.data.staffingRequestId}`);
    await this.staffingService.runMatching(job.data.staffingRequestId);
  }
}
