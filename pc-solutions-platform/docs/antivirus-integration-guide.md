# ClamAV Antivirus Integration Implementation Guide

## Overview

This guide documents the complete implementation of ClamAV antivirus scanning for file uploads in the Pro Crèche Solutions platform. The system follows a **quarantine → scan → promote** workflow to ensure all uploaded files are malware-free before being stored permanently.

## Architecture

### Core Components

1. **ClamAVService**: Interfaces with ClamAV daemon for malware scanning
2. **MimeValidationService**: Validates file types and extensions to prevent disguised files
3. **QuarantineStorageService**: Manages quarantine and safe storage (local or R2)
4. **AntivirusUploadController**: RESTful API for file upload and scanning
5. **HealthController**: Health check endpoints for monitoring

### Workflow

```
File Upload → MIME Validation → Quarantine Storage → ClamAV Scan → Promote to Safe Storage
     ↓              ↓                    ↓                ↓                    ↓
   Validate      Check Type         Temporary         Scan Buffer         Permanent
   File Size     & Extension        Storage           for Malware         Storage
```

## Implementation Details

### 1. Backend Services

#### ClamAVService (`apps/api/src/security/clamav.service.ts`)
```typescript
// Key features:
- Ping ClamAV daemon for health checks
- Scan file buffers for malware
- Scan files from disk
- Get ClamAV version information
- Comprehensive error handling with fail-closed approach
```

#### MimeValidationService (`apps/api/src/security/mime-validation.service.ts`)
```typescript
// Key features:
- File type detection from buffer content
- Extension validation against allowlist
- MIME type validation against allowlist
- MIME/extension mismatch detection
- File size validation
- Configurable allowlists via environment variables
```

#### QuarantineStorageService (`apps/api/src/security/quarantine-storage.service.ts`)
```typescript
// Key features:
- Quarantine storage (temporary, before scan)
- Safe storage (permanent, after clean scan)
- Support for both local filesystem and Cloudflare R2
- Automatic cleanup of quarantine files
- Unique filename generation with timestamps
- Metadata tracking for audit trails
```

### 2. API Endpoints

#### Antivirus Upload Controller
- `POST /api/antivirus-upload/scan` - Upload and scan file for malware
- `POST /api/antivirus-upload/health` - Check antivirus scanner health
- `POST /api/antivirus-upload/config` - Get antivirus configuration (admin only)

#### Health Check Controller
- `GET /api/health/clamav` - ClamAV-specific health check
- `GET /api/health/upload` - Upload system health check
- `GET /api/health/security` - Overall security system health check

### 3. Frontend Components

#### AntivirusUploadStatus (`packages/ui/src/components/AntivirusUploadStatus.tsx`)
```typescript
// Features:
- Real-time scanning status display
- Error message handling for different scenarios
- Success confirmation for clean files
- Internationalized messages
- Swiss theme integration
```

#### useAntivirusUpload Hook
```typescript
// Methods:
- uploadAndScan() - Upload file and scan for malware
- checkHealth() - Check antivirus scanner health
- State management for scanning status and results
```

## Configuration

### Environment Variables

```bash
# ClamAV Configuration
CLAMAV_HOST=clamav                    # ClamAV daemon hostname
CLAMAV_PORT=3310                      # ClamAV daemon port

# Upload Limits
UPLOAD_MAX_MB=20                      # Maximum file size in MB

# Allowed File Types
UPLOAD_ALLOWED_EXT=pdf,png,jpg,jpeg,webp,doc,docx
UPLOAD_ALLOWED_MIME=application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Storage Configuration
UPLOAD_MODE=local                     # local|r2
R2_BUCKET_SAFE=pc-solutions-assets-safe
R2_BUCKET_QUARANTINE=pc-solutions-assets-quarantine
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

### Docker Configuration

#### ClamAV Dockerfile (`docker/Dockerfile.clamav`)
```dockerfile
FROM debian:stable-slim

# Install ClamAV and supervisor
RUN apt-get update && apt-get install -y \
    clamav clamav-daemon curl ca-certificates sed supervisor \
    && rm -rf /var/lib/apt/lists/*

# Configure ClamAV
RUN sed -i 's/^Example/#Example/' /etc/clamav/freshclam.conf

# Supervisor configuration for clamd + freshclam
COPY supervisor-clamav.conf /etc/supervisor/conf.d/clamav.conf

EXPOSE 3310
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/clamav.conf"]
```

#### Supervisor Configuration (`docker/supervisor-clamav.conf`)
```ini
[program:freshclam]
command=/usr/bin/freshclam -d -c 6
autorestart=true
priority=5

[program:clamd]
command=/usr/sbin/clamd --foreground=true
autorestart=true
priority=10
```

#### Docker Compose (`docker-compose.yml`)
```yaml
services:
  clamav:
    build:
      context: ./docker
      dockerfile: Dockerfile.clamav
    restart: unless-stopped
    ports:
      - "3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdscan", "--version"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    environment:
      - CLAMAV_HOST=clamav
      - CLAMAV_PORT=3310
    depends_on:
      clamav:
        condition: service_healthy
```

## Security Features

### 1. File Validation
- **MIME Type Detection**: Uses `file-type` library to detect actual file type from content
- **Extension Validation**: Validates file extensions against allowlist
- **MIME/Extension Mismatch**: Detects potential security risks from disguised files
- **File Size Limits**: Configurable maximum file size limits

### 2. Malware Scanning
- **ClamAV Integration**: Industry-standard antivirus scanning
- **Real-time Scanning**: Files scanned immediately upon upload
- **Fail-Closed Approach**: If scanner is unavailable, uploads are blocked
- **Comprehensive Logging**: All scan results logged for audit

### 3. Storage Security
- **Quarantine System**: Files stored temporarily until scan completion
- **Safe Storage**: Only clean files promoted to permanent storage
- **Automatic Cleanup**: Quarantine files automatically deleted after processing
- **Audit Trail**: Complete metadata tracking for compliance

### 4. Access Control
- **Authentication Required**: All upload endpoints require valid JWT
- **Role-Based Access**: Admin endpoints restricted to admin users
- **Rate Limiting**: Protection against DoS attacks
- **Input Validation**: Comprehensive input validation and sanitization

## Error Handling

### Client-Side Error Messages

| Scenario | HTTP Status | User Message |
|----------|-------------|--------------|
| Malware detected | 400 | "Upload blocked — file contains harmful code" |
| Scanner unavailable | 503 | "Virus scanner temporarily unavailable. Please retry in a moment." |
| Invalid file type | 400 | "Invalid file type" |
| File too large | 413 | "File size exceeds maximum allowed size" |
| Network error | - | "Network error occurred" |

### Server-Side Logging

```typescript
// Logging examples:
this.logger.log(`File scan completed clean for user ${userId}, file: ${originalName}`);
this.logger.warn(`Malware detected for user ${userId}, file: ${originalName}`);
this.logger.error(`ClamAV scan failed for user ${userId}, file: ${originalName}`, error);
```

## Usage Examples

### 1. Basic File Upload with Antivirus Scanning

```tsx
import { useAntivirusUpload, AntivirusUploadStatus } from '@repo/ui';

function FileUploadComponent() {
  const { uploadAndScan, isScanning, scanResult, errorMessage } = useAntivirusUpload();

  const handleFileSelect = async (file: File) => {
    const result = await uploadAndScan(file);
    if (result?.success) {
      console.log('File uploaded and scanned successfully:', result);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      <AntivirusUploadStatus
        isScanning={isScanning}
        scanResult={scanResult}
        errorMessage={errorMessage}
      />
    </div>
  );
}
```

### 2. Health Check Integration

```tsx
import { useAntivirusUpload } from '@repo/ui';

function HealthCheckComponent() {
  const { checkHealth } = useAntivirusUpload();

  const handleHealthCheck = async () => {
    const isHealthy = await checkHealth();
    if (isHealthy) {
      console.log('Antivirus scanner is healthy');
    } else {
      console.log('Antivirus scanner is not responding');
    }
  };

  return (
    <button onClick={handleHealthCheck}>
      Check Antivirus Health
    </button>
  );
}
```

### 3. API Integration

```typescript
// Upload and scan file
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/antivirus-upload/scan', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
// result.scanResult: 'clean' | 'infected' | 'error'
```

## Monitoring & Observability

### 1. Health Checks
- **ClamAV Health**: `/api/health/clamav` - Checks if ClamAV daemon is responding
- **Upload System Health**: `/api/health/upload` - Validates upload configuration
- **Security System Health**: `/api/health/security` - Overall security component status

### 2. Logging
- **Scan Results**: All scan results logged with user ID and filename hash
- **Error Tracking**: Comprehensive error logging for troubleshooting
- **Performance Metrics**: Scan duration and success rates
- **Security Events**: Malware detection and blocked uploads

### 3. Metrics to Monitor
- **Scan Success Rate**: Percentage of successful scans
- **Malware Detection Rate**: Frequency of malware detection
- **Scanner Availability**: Uptime of ClamAV daemon
- **Upload Volume**: Number of files processed
- **Error Rates**: Frequency of different error types

## Testing

### 1. Unit Tests
```typescript
// Test ClamAV service
describe('ClamAVService', () => {
  it('should detect malware in EICAR test file', async () => {
    const eicarBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
    const isClean = await clamAVService.scanBuffer(eicarBuffer);
    expect(isClean).toBe(false);
  });
});
```

### 2. Integration Tests
```typescript
// Test complete upload flow
describe('Antivirus Upload Flow', () => {
  it('should quarantine, scan, and promote clean files', async () => {
    const cleanFile = createTestFile('clean.pdf');
    const result = await uploadAndScan(cleanFile);
    expect(result.scanResult).toBe('clean');
  });
});
```

### 3. E2E Tests
```typescript
// Test with Playwright
test('should block infected files', async ({ page }) => {
  await page.goto('/upload');
  await page.setInputFiles('input[type="file"]', 'test-files/eicar.txt');
  await page.click('button[type="submit"]');
  await expect(page.locator('.error-message')).toContainText('Upload blocked');
});
```

## Deployment

### 1. Development Setup
```bash
# Start ClamAV and API services
docker-compose up -d clamav api

# Check ClamAV health
curl http://localhost:3000/api/health/clamav
```

### 2. Production Deployment
- **ClamAV Service**: Deploy as separate Docker service or sidecar
- **Database**: Ensure PostgreSQL is available for audit logging
- **Storage**: Configure R2 buckets for quarantine and safe storage
- **Monitoring**: Set up health check monitoring and alerting

### 3. Render Deployment
```yaml
# render.yaml
services:
  - type: web
    name: api
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: CLAMAV_HOST
        value: clamav-service
      - key: CLAMAV_PORT
        value: 3310

  - type: web
    name: clamav
    env: docker
    dockerfilePath: ./docker/Dockerfile.clamav
```

## Troubleshooting

### Common Issues

1. **ClamAV Not Responding**
   - Check if ClamAV daemon is running
   - Verify network connectivity between API and ClamAV
   - Check ClamAV logs for errors

2. **File Type Validation Failures**
   - Verify allowed extensions and MIME types in configuration
   - Check if file-type detection is working correctly
   - Review MIME/extension mismatch detection

3. **Storage Issues**
   - Verify R2 credentials and bucket permissions
   - Check local filesystem permissions for quarantine directory
   - Monitor storage space usage

4. **Performance Issues**
   - Monitor ClamAV scan times
   - Check for large file processing bottlenecks
   - Review database query performance

### Debug Tools
- **Health Endpoints**: Use `/api/health/*` endpoints for system status
- **Logs**: Review application logs for detailed error information
- **ClamAV Logs**: Check ClamAV daemon logs for scan issues
- **Storage Monitoring**: Monitor quarantine and safe storage usage

## Security Considerations

### 1. Fail-Closed Design
- If ClamAV is unavailable, all uploads are blocked
- No files are promoted to safe storage without successful scan
- Comprehensive error handling prevents bypassing security

### 2. Input Validation
- File type validation prevents disguised files
- File size limits prevent DoS attacks
- MIME/extension mismatch detection prevents security bypasses

### 3. Audit Trail
- All uploads logged with user ID and timestamp
- Scan results recorded for compliance
- Quarantine files maintained until scan completion

### 4. Access Control
- Authentication required for all upload endpoints
- Role-based access for admin functions
- Rate limiting prevents abuse

## Future Enhancements

### 1. Advanced Features
- **Async Scanning**: For very large files with polling status
- **File Sanitization**: Additional cleaning for PDFs and Office documents
- **Threat Intelligence**: Integration with threat intelligence feeds
- **Machine Learning**: ML-based malware detection as secondary check

### 2. Performance Optimizations
- **Scan Caching**: Cache scan results for identical files
- **Parallel Scanning**: Multiple ClamAV instances for high volume
- **Streaming Scans**: Scan files as they're uploaded
- **CDN Integration**: Scan files at edge locations

### 3. User Experience
- **Progress Indicators**: Real-time scan progress
- **Batch Uploads**: Multiple file upload with batch scanning
- **Upload Queue**: Queue management for large uploads
- **Retry Logic**: Automatic retry for failed scans

This implementation provides a robust, secure, and scalable antivirus scanning system that protects the Pro Crèche Solutions platform from malware while maintaining excellent user experience and operational visibility.