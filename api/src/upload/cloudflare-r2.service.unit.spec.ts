import { CloudflareR2Service } from './cloudflare-r2.service';
import { AssetKind } from '@prisma/client';

describe('CloudflareR2Service.validateFile', () => {
  const makeService = () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as any;

    return new CloudflareR2Service(configService);
  };

  it('allows spreadsheet uploads for DOCUMENT asset kind', () => {
    const service = makeService();

    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'application/vnd.oasis.opendocument.spreadsheet',
    ];

    for (const mimetype of allowedMimeTypes) {
      expect(() =>
        service.validateFile(
          {
            originalname: `test.${mimetype.includes('csv') ? 'csv' : 'xlsx'}`,
            mimetype,
            size: 1024,
          } as any,
          AssetKind.DOCUMENT,
        ),
      ).not.toThrow();
    }
  });

  it('still rejects disallowed mime types for DOCUMENT', () => {
    const service = makeService();

    expect(() =>
      service.validateFile(
        {
          originalname: 'malware.exe',
          mimetype: 'application/x-msdownload',
          size: 1024,
        } as any,
        AssetKind.DOCUMENT,
      ),
    ).toThrow(/not allowed/i);
  });
});

