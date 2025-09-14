import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../upload/cloudflare-r2.service';

export interface CsvProductData {
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  imageUrl?: string;
}

export interface CsvProcessingResult {
  success: boolean;
  processedRows: number;
  createdProducts: number;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class CsvProcessingService {
  private readonly logger = new Logger(CsvProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: CloudflareR2Service,
  ) {}

  async processCsvCatalog(csvAssetId: string, catalogId: string, supplierId: string): Promise<CsvProcessingResult> {
    const result: CsvProcessingResult = {
      success: false,
      processedRows: 0,
      createdProducts: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Get the CSV asset
      const csvAsset = await this.prisma.asset.findUnique({
        where: { id: csvAssetId },
      });

      if (!csvAsset) {
        result.errors.push('CSV asset not found');
        return result;
      }

      if (csvAsset.kind !== 'CATALOG_CSV') {
        result.errors.push('Asset is not a CSV file');
        return result;
      }

      // Download CSV content from R2
      const csvContent = await this.r2Service.getFileContent(csvAsset.storageKey);
      
      if (!csvContent) {
        result.errors.push('Could not download CSV content');
        return result;
      }

      // Parse CSV content
      const csvData = this.parseCsv(csvContent.toString());
      result.processedRows = csvData.length;

      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        try {
          const row = csvData[i];
          const productData = this.mapCsvRowToProduct(row);
          
          if (!productData.title) {
            result.warnings.push(`Row ${i + 1}: Missing product title, skipping`);
            continue;
          }

          // Create product
          await this.prisma.product.create({
            data: {
              title: productData.title,
              description: productData.description,
              price: productData.price,
              category: productData.category,
              tags: productData.tags || [],
              supplierId,
              isActive: true,
            },
          });

          result.createdProducts++;
        } catch (error) {
          const errorMsg = `Row ${i + 1}: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      
      // Update catalog with processing status
      await this.prisma.catalog.update({
        where: { id: catalogId },
        data: {
          updatedAt: new Date(),
        },
      });

      this.logger.log(`CSV processing completed for catalog ${catalogId}: ${result.createdProducts} products created`);
      
    } catch (error) {
      const errorMsg = `CSV processing failed: ${(error as Error).message}`;
      result.errors.push(errorMsg);
      this.logger.error(errorMsg);
    }

    return result;
  }

  private parseCsv(content: string): any[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }

    return data;
  }

  private parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private mapCsvRowToProduct(row: any): CsvProductData {
    return {
      title: row.title || row.name || row.product_name || '',
      description: row.description || row.desc || '',
      price: this.parsePrice(row.price || row.cost || row.price_chf),
      category: row.category || row.type || '',
      tags: this.parseTags(row.tags || row.keywords || ''),
      imageUrl: row.image_url || row.image || '',
    };
  }

  private parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;
    
    const cleaned = priceStr.replace(/[^\d.,]/g, '');
    const price = parseFloat(cleaned.replace(',', '.'));
    
    return isNaN(price) ? undefined : price;
  }

  private parseTags(tagsStr: string): string[] {
    if (!tagsStr) return [];
    
    return tagsStr
      .split(/[,;|]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  // Get CSV processing template
  getCsvTemplate(): string {
    return `title,description,price,category,tags,image_url
"Product Name","Product description",29.99,"Category Name","tag1,tag2","https://example.com/image.jpg"
"Another Product","Another description",49.99,"Category Name","tag3,tag4","https://example.com/image2.jpg"`;
  }
}