import { Module } from '@nestjs/common';
import { MockDatabaseService } from './mock-database.service';
import { MockFrontendSettingsService } from './mock-frontend-settings.service';
import { MockFrontendSettingsController } from './mock-frontend-settings.controller';

@Module({
  providers: [MockDatabaseService, MockFrontendSettingsService],
  controllers: [MockFrontendSettingsController],
  exports: [MockDatabaseService, MockFrontendSettingsService],
})
export class MockModule {}