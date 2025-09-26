import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { FrontendSettingsController } from '../src/frontend-settings/frontend-settings.controller';
import { FrontendSettingsService } from '../src/frontend-settings/frontend-settings.service';
import { UpdateFrontendSettingsDto } from '../src/frontend-settings/dto/update-frontend-settings.dto';

describe('FrontendSettings Validation', () => {
  let controller: FrontendSettingsController;
  let service: FrontendSettingsService;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    const mockService = {
      updateSettings: jest.fn(),
      getSettings: jest.fn(),
      getPublicSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrontendSettingsController],
      providers: [
        {
          provide: FrontendSettingsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FrontendSettingsController>(FrontendSettingsController);
    service = module.get<FrontendSettingsService>(FrontendSettingsService);

    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('UpdateFrontendSettingsDto Validation', () => {
    it('should accept valid update data', async () => {
      const validData = {
        siteName: 'Test Site',
        siteDescription: 'Test Description',
        contactEmail: 'test@example.com',
        primaryColor: '#3B82F6',
        logoAssetId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, validData);

      const errors = await validationPipe.transform(dto, {
        type: 'body',
        metatype: UpdateFrontendSettingsDto,
      });

      expect(errors).toBeDefined();
      expect(errors.siteName).toBe('Test Site');
      expect(errors.contactEmail).toBe('test@example.com');
    });

    it('should reject invalid color values', async () => {
      const invalidData = {
        primaryColor: 'invalid-color',
        secondaryColor: 'not-a-hex',
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, invalidData);

      try {
        await validationPipe.transform(dto, {
          type: 'body',
          metatype: UpdateFrontendSettingsDto,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('primaryColor must be a valid hex color');
        expect(error.message).toContain('secondaryColor must be a valid hex color');
      }
    });

    it('should reject invalid UUID values', async () => {
      const invalidData = {
        logoAssetId: 'invalid-uuid',
        faviconAssetId: 'not-a-uuid',
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, invalidData);

      try {
        await validationPipe.transform(dto, {
          type: 'body',
          metatype: UpdateFrontendSettingsDto,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('logoAssetId must be a UUID');
        expect(error.message).toContain('faviconAssetId must be a UUID');
      }
    });

    it('should reject invalid URL values', async () => {
      const invalidData = {
        facebookUrl: 'not-a-url',
        twitterUrl: 'invalid',
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, invalidData);

      try {
        await validationPipe.transform(dto, {
          type: 'body',
          metatype: UpdateFrontendSettingsDto,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('facebookUrl must be a URL');
        expect(error.message).toContain('twitterUrl must be a URL');
      }
    });

    it('should accept all asset ID fields', async () => {
      const validData = {
        logoAssetId: '123e4567-e89b-12d3-a456-426614174000',
        faviconAssetId: '123e4567-e89b-12d3-a456-426614174001',
        ogImageAssetId: '123e4567-e89b-12d3-a456-426614174002',
        adminLogoAssetId: '123e4567-e89b-12d3-a456-426614174003',
        adminFaviconAssetId: '123e4567-e89b-12d3-a456-426614174004',
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, validData);

      const errors = await validationPipe.transform(dto, {
        type: 'body',
        metatype: UpdateFrontendSettingsDto,
      });

      expect(errors).toBeDefined();
      expect(errors.logoAssetId).toBe(validData.logoAssetId);
      expect(errors.faviconAssetId).toBe(validData.faviconAssetId);
      expect(errors.ogImageAssetId).toBe(validData.ogImageAssetId);
      expect(errors.adminLogoAssetId).toBe(validData.adminLogoAssetId);
      expect(errors.adminFaviconAssetId).toBe(validData.adminFaviconAssetId);
    });

    it('should reject non-whitelisted fields', async () => {
      const invalidData = {
        siteName: 'Test Site',
        id: '123e4567-e89b-12d3-a456-426614174000', // Not allowed
        createdAt: new Date(), // Not allowed
        updatedAt: new Date(), // Not allowed
        logoAsset: { id: '123' }, // Not allowed
      };

      const dto = new UpdateFrontendSettingsDto();
      Object.assign(dto, invalidData);

      try {
        await validationPipe.transform(dto, {
          type: 'body',
          metatype: UpdateFrontendSettingsDto,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('property id should not exist');
        expect(error.message).toContain('property createdAt should not exist');
        expect(error.message).toContain('property updatedAt should not exist');
        expect(error.message).toContain('property logoAsset should not exist');
      }
    });
  });

  describe('Controller Integration', () => {
    it('should call service with filtered data', async () => {
      const mockRequest = {
        context: {
          userId: 'user_123',
          role: 'ADMIN',
        },
      };

      const updateData = {
        siteName: 'Updated Site',
        siteDescription: 'Updated Description',
        contactEmail: 'updated@example.com',
      };

      jest.spyOn(service, 'updateSettings').mockResolvedValue({
        id: '123',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await controller.updateSettings(updateData);

      expect(service.updateSettings).toHaveBeenCalledWith(updateData);
    });
  });
});