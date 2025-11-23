import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module'; // Adjust import if needed
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private clerk: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (clerkSecretKey) {
      this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    }
  }

  async completeProfile(clerkId: string, dto: CompleteProfileDto) {
    this.logger.log(`Completing profile for user ${clerkId} with role ${dto.role}`);

    // 1. Check if user already exists in DB
    const existingAppUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (existingAppUser) {
      this.logger.warn(`User ${clerkId} already has a profile`);
      throw new ConflictException('User profile already exists');
    }

    // 2. Fetch user from Clerk to get details (email, name)
    const clerkUser = await this.clerk.users.getUser(clerkId);
    
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';

    if (!primaryEmail) {
        throw new Error('User does not have an email address in Clerk');
    }

    // 3. Create User in DB (Transaction)
    return await this.prisma.$transaction(async (tx) => {
      // Create AppUser
      const appUser = await tx.appUser.create({
        data: {
          clerkId,
          email: primaryEmail,
          role: dto.role,
        },
      });

      // Create User
      const user = await tx.user.create({
        data: {
            // Use same ID as AppUser if that's the pattern, or let it autogenerate
            // Based on webhook controller: 
            // await tx.user.create({ data: { clerkId, ... } })
            // Wait, webhook controller does:
            // appUser = await tx.appUser.upsert(...)
            // await tx.user.upsert(...)
            // It doesn't seem to link them by ID explicitly in the code I read, 
            // but User model has `id` as uuid.
            // Let's follow the webhook pattern.
          clerkId,
          email: primaryEmail,
          firstName,
          lastName,
          role: dto.role,
          phoneNumber: dto.phone,
          isActive: true,
          // Add other fields from DTO or defaults
        },
      });
      
      // Handle Organization creation if needed (Foundation, Supplier, Service Provider)
      if ([UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(dto.role) && dto.organisationName) {
          // Determine Org Type
          let orgType;
          if (dto.role === UserRole.FOUNDATION) orgType = 'FOUNDATION';
          else if (dto.role === UserRole.PRODUCT_SUPPLIER) orgType = 'PRODUCT_SUPPLIER';
          else if (dto.role === UserRole.SERVICE_PROVIDER) orgType = 'SERVICE_PROVIDER';

          if (orgType) {
             const org = await tx.organization.create({
                 data: {
                     name: dto.organisationName,
                     type: orgType,
                     canton: dto.canton,
                     phoneNumber: dto.phone,
                     contactPerson: `${firstName} ${lastName}`.trim(),
                     members: {
                         create: {
                             userId: user.id,
                             role: dto.role
                         }
                     }
                 }
             });
          }
      }

      // 4. Update Clerk Metadata
      await this.clerk.users.updateUser(clerkId, {
        publicMetadata: {
          role: dto.role,
        },
        unsafeMetadata: {
          role: undefined, // Clear any unsafe metadata
          signupType: undefined,
          completedProfile: true
        },
      });

      return user;
    });
  }
}
