import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async extractText(buffer: Buffer): Promise<string> {
    try {
      // Use pdf-parse which is Node.js native and doesn't require DOM APIs
      // pdf-parse v2.4.5 exports a PDFParse class that needs to be instantiated
      const pdfParseModule = require('pdf-parse');
      
      // Check if PDFParse class exists and use it
      if (pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text || '';
      }
      
      // Fallback: try calling as function (older versions)
      if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(buffer);
        return data.text || '';
      }
      
      // Try default export
      const parseFunction = (pdfParseModule as any).default || pdfParseModule;
      if (typeof parseFunction === 'function') {
        const data = await parseFunction(buffer);
        return data.text || '';
      }
      
      throw new Error(`pdf-parse module does not export a usable function or class`);
    } catch (error: any) {
      this.logger.error(`PDF parsing failed: ${error.message}`, error.stack);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }
}

