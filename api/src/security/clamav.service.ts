import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as clamd from 'clamdjs';

@Injectable()
export class ClamAVService {
  private readonly logger = new Logger(ClamAVService.name);
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('CLAMAV_HOST') || 'localhost';
    this.port = Number(this.configService.get<string>('CLAMAV_PORT') || '3310');
    this.timeout = 60000; // 60 seconds timeout
  }

  /**
   * Create a ClamAV scanner instance
   */
  private createScanner() {
    return clamd.createScanner(this.host, this.port, { timeout: this.timeout });
  }

  /**
   * Ping ClamAV daemon to check if it's available
   */
  async ping(): Promise<boolean> {
    try {
      const scanner = this.createScanner();
      const result = await scanner.ping();
      const isAlive = result === 'PONG';
      
      this.logger.log(`ClamAV ping: ${isAlive ? 'OK' : 'FAILED'}`);
      return isAlive;
    } catch (error) {
      this.logger.error('ClamAV ping failed', error);
      return false;
    }
  }

  /**
   * Scan a buffer for malware
   * @param buffer File buffer to scan
   * @returns Promise<boolean> true if clean, false if infected
   */
  async scanBuffer(buffer: Buffer): Promise<boolean> {
    try {
      const scanner = this.createScanner();
      const result = await scanner.scanBuffer(buffer);
      
      // ClamAV returns a string with "FOUND" if malware is detected
      const isInfected = typeof result === 'string' ? result.includes('FOUND') : !!(result as any).malicious;
      
      if (isInfected) {
        this.logger.warn(`Malware detected: ${result}`);
        return false;
      }
      
      this.logger.log('File scan completed: CLEAN');
      return true;
    } catch (error) {
      this.logger.error('ClamAV scan failed', error);
      throw new ServiceUnavailableException('Virus scanner unavailable. Please try later.');
    }
  }

  /**
   * Scan a file from disk
   * @param filePath Path to the file to scan
   * @returns Promise<boolean> true if clean, false if infected
   */
  async scanFile(filePath: string): Promise<boolean> {
    try {
      const scanner = this.createScanner();
      const result = await scanner.scanFile(filePath);
      
      const isInfected = typeof result === 'string' ? result.includes('FOUND') : !!(result as any).malicious;
      
      if (isInfected) {
        this.logger.warn(`Malware detected in file ${filePath}: ${result}`);
        return false;
      }
      
      this.logger.log(`File scan completed for ${filePath}: CLEAN`);
      return true;
    } catch (error) {
      this.logger.error(`ClamAV scan failed for file ${filePath}`, error);
      throw new ServiceUnavailableException('Virus scanner unavailable. Please try later.');
    }
  }

  /**
   * Get ClamAV version and database info
   */
  async getVersion(): Promise<string> {
    try {
      const scanner = this.createScanner();
      const result = await scanner.version();
      this.logger.log(`ClamAV version: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to get ClamAV version', error);
      throw new ServiceUnavailableException('Virus scanner unavailable. Please try later.');
    }
  }

  /**
   * Check if ClamAV service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await this.ping();
    } catch (error) {
      this.logger.error('ClamAV health check failed', error);
      return false;
    }
  }
}