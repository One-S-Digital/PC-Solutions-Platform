import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../upload/cloudflare-r2.service';
import { AssetKind, ContentType } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private r2Service: CloudflareR2Service,
  ) {}

  async uploadElearningContent(
    file: Express.Multer.File,
    body: any,
    appUserId: string,
  ) {
    let uploadResult: { url: string; key: string } | undefined;

    try {
      // Upload file to R2
      uploadResult = await this.r2Service.uploadFile(
        file,
        AssetKind.DOCUMENT,
        appUserId,
      );

      try {
        // Wrap all DB operations in a transaction for atomicity
        const result = await this.prisma.$transaction(async (tx) => {
          // Create course record
          const course = await tx.course.create({
            data: {
              title: body.title || file.originalname.replace(/\.[^/.]+$/, ''),
              description: body.description || `E-learning content: ${file.originalname}`,
              difficultyLevel: body.difficultyLevel || 'beginner',
              estimatedDuration: parseInt(body.estimatedDuration) || 60,
              status: 'DRAFT',
              createdBy: appUserId,
            },
          });

          // Create course module
          const module = await tx.courseModule.create({
            data: {
              courseId: course.id,
              title: 'Main Content',
              description: 'Primary content module',
              sortOrder: 0,
              isRequired: true,
            },
          });

          // Create course lesson with uploaded content
          const lesson = await tx.courseLesson.create({
            data: {
              moduleId: module.id,
              title: file.originalname.replace(/\.[^/.]+$/, ''),
              contentType: this.getContentTypeFromFile(file.mimetype),
              contentUrl: uploadResult.url,
              contentText: body.description || null,
              duration: parseInt(body.estimatedDuration) || 60,
              sortOrder: 0,
              isRequired: true,
            },
          });

          return {
            course,
            module,
            lesson,
            publicUrl: uploadResult.url,
          };
        }, { timeout: 10000 }); // 10 second timeout for transaction

        return result;
      } catch (dbError) {
        // If DB operations fail, clean up the uploaded file
        if (uploadResult) {
          try {
            await this.r2Service.deleteFile(uploadResult.key);
          } catch (deleteError) {
            console.error('Failed to delete orphaned file:', deleteError);
          }
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error uploading e-learning content:', error);
      throw new BadRequestException(`Failed to upload e-learning content: ${error.message}`);
    }
  }

  async uploadHrDocument(
    file: Express.Multer.File,
    body: any,
    appUserId: string,
  ) {
    let uploadResult: { url: string; key: string } | undefined;

    try {
      // Upload file to R2
      uploadResult = await this.r2Service.uploadFile(
        file,
        AssetKind.DOCUMENT,
        appUserId,
      );

      try {
        // Wrap DB operation in transaction
        const result = await this.prisma.$transaction(async (tx) => {
          // Create HR document record
          const hrDocument = await tx.asset.create({
            data: {
              kind: AssetKind.DOCUMENT,
              filename: file.originalname,
              publicUrl: uploadResult.url,
              storageKey: uploadResult.key,
              mimeType: file.mimetype,
              size: file.size,
              uploadedById: appUserId,
            },
          });

          return {
            id: hrDocument.id,
            title: body.title || file.originalname.replace(/\.[^/.]+$/, ''),
            category: body.category || 'HR_PROCEDURE',
            description: body.description || `HR Procedure: ${file.originalname}`,
            filename: file.originalname,
            publicUrl: uploadResult.url,
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          };
        }, { timeout: 5000 });

        return result;
      } catch (dbError) {
        // If DB operation fails, clean up the uploaded file
        if (uploadResult) {
          try {
            await this.r2Service.deleteFile(uploadResult.key);
          } catch (deleteError) {
            console.error('Failed to delete orphaned file:', deleteError);
          }
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error uploading HR document:', error);
      throw new BadRequestException(`Failed to upload HR document: ${error.message}`);
    }
  }

  async uploadStatePolicy(
    file: Express.Multer.File,
    body: any,
    appUserId: string,
  ) {
    let uploadResult: { url: string; key: string } | undefined;

    try {
      // Upload file to R2
      uploadResult = await this.r2Service.uploadFile(
        file,
        AssetKind.DOCUMENT,
        appUserId,
      );

      try {
        // Wrap DB operation in transaction
        const result = await this.prisma.$transaction(async (tx) => {
          // Create state policy record
          const statePolicy = await tx.asset.create({
            data: {
              kind: AssetKind.DOCUMENT,
              filename: file.originalname,
              publicUrl: uploadResult.url,
              storageKey: uploadResult.key,
              mimeType: file.mimetype,
              size: file.size,
              uploadedById: appUserId,
            },
          });

          return {
            id: statePolicy.id,
            title: body.title || file.originalname.replace(/\.[^/.]+$/, ''),
            category: body.category || 'STATE_POLICY',
            description: body.description || `State Policy Update: ${file.originalname}`,
            effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
            filename: file.originalname,
            publicUrl: uploadResult.url,
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          };
        }, { timeout: 5000 });

        return result;
      } catch (dbError) {
        // If DB operation fails, clean up the uploaded file
        if (uploadResult) {
          try {
            await this.r2Service.deleteFile(uploadResult.key);
          } catch (deleteError) {
            console.error('Failed to delete orphaned file:', deleteError);
          }
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error uploading state policy:', error);
      throw new BadRequestException(`Failed to upload state policy: ${error.message}`);
    }
  }

  async getElearningContent() {
    try {
      const courses = await this.prisma.course.findMany({
        include: {
          category: true,
          creator: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
          modules: {
            include: {
              lessons: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: courses,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching e-learning content:', error);
      throw new BadRequestException(`Failed to fetch e-learning content: ${error.message}`);
    }
  }

  async getHrDocuments() {
    try {
      // For now, we'll return assets with DOCUMENT kind that are likely HR documents
      // In a real implementation, you'd have a dedicated HR documents table
      const hrDocuments = await this.prisma.asset.findMany({
        where: {
          kind: AssetKind.DOCUMENT,
          filename: {
            contains: 'hr',
            mode: 'insensitive',
          },
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform to match expected format
      const transformedDocuments = hrDocuments.map(doc => ({
        id: doc.id,
        title: doc.filename.replace(/\.[^/.]+$/, ''),
        category: 'HR_PROCEDURE',
        description: `HR Procedure: ${doc.filename}`,
        filename: doc.filename,
        publicUrl: doc.publicUrl,
        size: doc.size,
        mimeType: doc.mimeType,
        uploadedAt: doc.createdAt,
        updatedAt: doc.createdAt,
      }));

      return {
        success: true,
        data: transformedDocuments,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching HR documents:', error);
      throw new BadRequestException(`Failed to fetch HR documents: ${error.message}`);
    }
  }

  async getStatePolicies() {
    try {
      // For now, we'll return assets with DOCUMENT kind that are likely state policies
      // In a real implementation, you'd have a dedicated state policies table
      const statePolicies = await this.prisma.asset.findMany({
        where: {
          kind: AssetKind.DOCUMENT,
          OR: [
            {
              filename: {
                contains: 'policy',
                mode: 'insensitive',
              },
            },
            {
              filename: {
                contains: 'state',
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform to match expected format
      const transformedPolicies = statePolicies.map(policy => ({
        id: policy.id,
        title: policy.filename.replace(/\.[^/.]+$/, ''),
        category: 'STATE_POLICY',
        description: `State Policy: ${policy.filename}`,
        effectiveDate: policy.createdAt,
        filename: policy.filename,
        publicUrl: policy.publicUrl,
        size: policy.size,
        mimeType: policy.mimeType,
        uploadedAt: policy.createdAt,
        updatedAt: policy.createdAt,
      }));

      return {
        success: true,
        data: transformedPolicies,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching state policies:', error);
      throw new BadRequestException(`Failed to fetch state policies: ${error.message}`);
    }
  }

  private getContentTypeFromFile(mimetype: string): ContentType {
    if (mimetype.startsWith('video/')) return ContentType.VIDEO;
    if (mimetype.startsWith('image/')) return ContentType.IMAGE;
    if (mimetype.includes('pdf') || mimetype.includes('document')) return ContentType.DOCUMENT;
    if (mimetype.includes('text/')) return ContentType.TEXT;
    return ContentType.DOCUMENT;
  }
}