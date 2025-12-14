import { Injectable, Logger } from '@nestjs/common';
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async extractText(buffer: Buffer): Promise<string> {
    try {
      // Use pdf-parse which is Node.js native and doesn't require DOM APIs
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      this.logger.error(`PDF parsing failed: ${error.message}`);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }
}

