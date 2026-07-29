import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';
import { MailingTransportService } from './mailing-transport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MailingController],
  providers: [MailingService, MailingTransportService],
  exports: [MailingService, MailingTransportService],
})
export class MailingModule implements OnModuleInit {
  private readonly logger = new Logger(MailingModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('MailingModule initialised — controller routes registered');
    await this.ensureMailingTemplatesTable();
  }

  private async ensureMailingTemplatesTable(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "mailing_templates" (
          "id"             TEXT NOT NULL,
          "name"           TEXT NOT NULL,
          "description"    TEXT,
          "subject"        TEXT NOT NULL,
          "body_html"      TEXT NOT NULL,
          "body_text"      TEXT,
          "created_by_id"  TEXT NOT NULL,
          "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "mailing_templates_pkey" PRIMARY KEY ("id")
        )
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "mailing_templates_created_by_id_idx"
        ON "mailing_templates"("created_by_id")
      `);
      this.logger.log('mailing_templates table ready');
    } catch (err: any) {
      this.logger.error(`mailing_templates startup table check failed: ${err?.message}`);
    }
  }
}
