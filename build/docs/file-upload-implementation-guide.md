# File Upload System Implementation Guide

## Overview

This document outlines the complete file upload system implementation for the Pro Crèche Solutions platform, featuring Cloudflare R2 integration, comprehensive validation, and a user-friendly upload modal.

## Architecture

### Backend (NestJS + Cloudflare R2)
- **CloudflareR2Service**: Handles direct R2 operations (upload, delete, presigned URLs)
- **UploadService**: Manages asset records in database and business logic
- **UploadController**: RESTful API endpoints for file operations
- **Validation**: File type, size, and security validation

### Frontend (React + TypeScript)
- **UploadModal**: Drag-and-drop file upload interface
- **FileUpload Components**: Specialized upload components for different asset types
- **useFileUpload Hook**: React hook for file upload operations
- **Progress Tracking**: Real-time upload progress and error handling

## Implementation Details

### 1. Backend Services

#### CloudflareR2Service (`apps/api/src/upload/cloudflare-r2.service.ts`)
```typescript
// Key features:
- Presigned URL generation for direct client uploads
- Direct server-side file uploads
- File validation (type, size, security)
- Storage key generation with organization
- File deletion and cleanup
- Download URL generation
```

#### UploadService (`apps/api/src/upload/upload.service.ts`)
```typescript
// Key features:
- Asset record management in database
- Ownership verification
- Asset statistics and analytics
- Orphaned file cleanup
- Organization asset associations
```

#### UploadController (`apps/api/src/upload/upload.controller.ts`)
```typescript
// API Endpoints:
POST /api/upload/presigned - Generate presigned upload URL
POST /api/upload/file - Direct file upload
GET /api/upload/asset/:id - Get asset information
GET /api/upload/assets - Get user assets
DELETE /api/upload/asset/:id - Delete asset
GET /api/upload/download/:id - Generate download URL
POST /api/upload/admin/cleanup - Clean orphaned files (admin)
```

### 2. Frontend Components

#### UploadModal (`packages/ui/src/components/UploadModal.tsx`)
```typescript
// Features:
- Drag-and-drop interface
- File validation
- Progress tracking
- Error handling
- Responsive design
- Accessibility support
```

#### FileUpload Components (`apps/frontend/src/components/FileUpload.tsx`)
```typescript
// Specialized components:
- AvatarUpload
- LogoUpload
- CoverImageUpload
- ProductImageUpload
- DocumentUpload
- CVUpload
```

#### useFileUpload Hook (`apps/frontend/src/hooks/useFileUpload.ts`)
```typescript
// Methods:
- uploadFile() - Direct upload
- generatePresignedUpload() - Get presigned URL
- uploadWithPresignedUrl() - Upload via presigned URL
- deleteAsset() - Delete asset
- getAssets() - Fetch user assets
- getDownloadUrl() - Get download URL
```

### 3. Database Schema

#### Asset Model
```sql
model Asset {
  id        String    @id @default(uuid())
  kind      AssetKind
  filename  String
  publicUrl String
  storageKey String
  mimeType  String?
  size      Int?
  uploadedBy String
  createdAt DateTime  @default(now())

  // Relations
  uploader User @relation(fields: [uploadedBy], references: [id])
  organizationLogos  Organization[] @relation("OrganizationLogo")
  organizationCovers Organization[] @relation("OrganizationCover")
  products Product[]
}
```

#### AssetKind Enum
```sql
enum AssetKind {
  AVATAR
  LOGO
  COVER_IMAGE
  PRODUCT_IMAGE
  DOCUMENT
  CV
}
```

## Configuration

### Environment Variables
```bash
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=pc-solutions-assets
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://assets.pc-solutions.com
```

### File Validation Rules
```typescript
const validationRules = {
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  LOGO: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  },
  COVER_IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  PRODUCT_IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  DOCUMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  CV: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};
```

## Usage Examples

### 1. Basic File Upload
```tsx
import { FileUpload } from '../components/FileUpload';
import { AssetKind } from '@prisma/client';

function ProfilePage() {
  const handleUploadComplete = (asset) => {
    console.log('Upload complete:', asset);
  };

  return (
    <FileUpload
      assetKind={AssetKind.AVATAR}
      onUploadComplete={handleUploadComplete}
    />
  );
}
```

### 2. Specialized Upload Components
```tsx
import { AvatarUpload, LogoUpload } from '../components/FileUpload';

function OrganizationSettings() {
  return (
    <div>
      <LogoUpload onUploadComplete={(asset) => setLogo(asset)} />
      <CoverImageUpload onUploadComplete={(asset) => setCover(asset)} />
    </div>
  );
}
```

### 3. Using the Upload Hook
```tsx
import { useFileUpload } from '../hooks/useFileUpload';

function CustomUploadComponent() {
  const { uploadFile, uploading, progress } = useFileUpload();

  const handleFileSelect = async (file) => {
    const result = await uploadFile(file, {
      assetKind: AssetKind.DOCUMENT,
      maxSize: 10 * 1024 * 1024,
    });

    if (result.success) {
      console.log('Upload successful:', result.asset);
    } else {
      console.error('Upload failed:', result.error);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {uploading && <div>Uploading... {progress}%</div>}
    </div>
  );
}
```

### 4. Presigned URL Upload (Advanced)
```tsx
import { useFileUpload } from '../hooks/useFileUpload';

function AdvancedUpload() {
  const { generatePresignedUpload, uploadWithPresignedUrl } = useFileUpload();

  const handleUpload = async (file) => {
    // Generate presigned URL
    const presignedData = await generatePresignedUpload(
      file.name,
      file.type,
      AssetKind.DOCUMENT
    );

    // Upload using presigned URL
    const result = await uploadWithPresignedUrl(file, presignedData);
    
    if (result.success) {
      console.log('Upload successful:', result.asset);
    }
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

## Security Features

### 1. File Validation
- **Type Validation**: Only allowed MIME types per asset kind
- **Size Validation**: Maximum file size limits per asset kind
- **Content Validation**: Basic file content verification
- **Virus Scanning**: Ready for integration with virus scanning services

### 2. Access Control
- **Ownership Verification**: Users can only access their own assets
- **Admin Override**: Admin users can access all assets
- **Organization Access**: Organization members can access organization assets
- **Presigned URLs**: Time-limited access URLs for secure downloads

### 3. Storage Security
- **Encrypted Storage**: Files stored encrypted in Cloudflare R2
- **Access Logging**: All file operations logged
- **Audit Trail**: Complete audit trail for compliance
- **Data Retention**: Configurable data retention policies

## Performance Optimizations

### 1. Upload Optimizations
- **Chunked Uploads**: Large files uploaded in chunks
- **Parallel Uploads**: Multiple files uploaded simultaneously
- **Progress Tracking**: Real-time upload progress
- **Resume Support**: Resume interrupted uploads

### 2. Storage Optimizations
- **CDN Integration**: Files served via Cloudflare CDN
- **Image Optimization**: Automatic image compression and resizing
- **Caching**: Aggressive caching for frequently accessed files
- **Compression**: Automatic file compression where applicable

### 3. Database Optimizations
- **Indexing**: Optimized database indexes for asset queries
- **Pagination**: Efficient pagination for asset lists
- **Cleanup Jobs**: Automated cleanup of orphaned files
- **Archiving**: Automatic archiving of old files

## Monitoring & Analytics

### 1. Upload Metrics
- Upload success/failure rates
- Average upload times
- File size distributions
- Storage usage by user/organization

### 2. Performance Metrics
- API response times
- Storage operation latencies
- CDN hit rates
- Error rates by operation type

### 3. Security Metrics
- Failed upload attempts
- Suspicious file uploads
- Access pattern anomalies
- Security policy violations

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check file size and type restrictions
   - Verify R2 credentials and permissions
   - Check network connectivity
   - Review error logs for specific issues

2. **Permission Errors**
   - Verify user authentication
   - Check asset ownership
   - Review organization membership
   - Validate admin permissions

3. **Storage Issues**
   - Check R2 bucket configuration
   - Verify storage key generation
   - Review cleanup job status
   - Check storage quotas

### Debug Tools
- Upload progress monitoring
- Error logging and tracking
- Storage usage analytics
- Performance profiling

## Future Enhancements

### 1. Advanced Features
- **Image Processing**: Automatic image resizing and optimization
- **Video Support**: Video upload and processing
- **Batch Uploads**: Multiple file upload interface
- **Drag-and-Drop**: Enhanced drag-and-drop functionality

### 2. Integration Features
- **Virus Scanning**: Integration with virus scanning services
- **Content Moderation**: AI-powered content moderation
- **OCR Processing**: Optical character recognition for documents
- **Metadata Extraction**: Automatic metadata extraction

### 3. User Experience
- **Upload Queue**: Upload queue management
- **Preview Generation**: Automatic preview generation
- **Thumbnail Creation**: Automatic thumbnail creation
- **Progress Persistence**: Resume uploads across sessions

This implementation provides a robust, scalable, and secure file upload system that integrates seamlessly with the Pro Crèche Solutions platform while maintaining high performance and user experience standards.