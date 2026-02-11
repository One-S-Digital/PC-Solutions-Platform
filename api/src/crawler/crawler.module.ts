import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CrawlerService } from './crawler.service';
import { CrawlerScheduler } from './crawler.scheduler';
import { CrawlerController } from './crawler.controller';
import { CrawlerSettingsService } from './crawler-settings.service';
import { HtmlParserService } from './parsers/html-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import { PlaywrightRendererService } from './parsers/playwright-renderer.service';
import { ClassifierService } from './classifier/classifier.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerScheduler,
    CrawlerSettingsService,
    HtmlParserService,
    PdfParserService,
    PlaywrightRendererService,
    ClassifierService,
  ],
  exports: [CrawlerService, CrawlerScheduler],
})
export class CrawlerModule {}

