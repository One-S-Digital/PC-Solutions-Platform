import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { SkipEnvelope } from '../common/interceptors/response-envelope.interceptor';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @SkipEnvelope() // Don't wrap in envelope - Prometheus expects plain text
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  @ApiExcludeEndpoint() // Don't show in Swagger UI
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
