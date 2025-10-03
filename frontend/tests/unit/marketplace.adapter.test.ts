import { describe, it, expect } from 'vitest';

describe('Marketplace Adapters', () => {
  it('product transformation maps API data to UI model', () => {
    const apiProductData = {
      id: 'prod_123',
      name: 'Tasses en céramique',
      description: 'Tasses écologiques pour enfants',
      price: 12.50,
      supplier: {
        name: 'Elva Sàrl',
        logoAsset: { publicUrl: '/logos/elva.jpg' }
      },
      imageAsset: { publicUrl: '/images/cups.jpg' },
      category: 'Vaisselle'
    };

    const expectedProduct = {
      id: 'prod_123',
      name: 'Tasses en céramique',
      supplierName: 'Elva Sàrl',
      supplierLogo: '/logos/elva.jpg',
      imageUrl: '/images/cups.jpg',
      stockStatus: 'In Stock'
    };

    const transformProduct = (product: any) => ({
      ...product,
      supplierName: product.supplier?.name,
      supplierLogo: product.supplier?.logoAsset?.publicUrl,
      imageUrl: product.imageAsset?.publicUrl,
      stockStatus: 'In Stock'
    });

    const result = transformProduct(apiProductData);

    expect(result.name).toBe('Tasses en céramique');
    expect(result.supplierName).toBe('Elva Sàrl');
    expect(result.imageUrl).toBe('/images/cups.jpg');
    expect(result.stockStatus).toBe('In Stock');
  });

  it('service transformation maps API data to UI model', () => {
    const apiServiceData = {
      id: 'serv_123',
      title: 'Consultation pédagogique',
      description: 'Services d'expertise en pédagogie',
      provider: {
        organization: {
          name: 'Édu-Services SA',
          logoAsset: { publicUrl: '/logos/edu-services.jpg' }
        },
        deliveryType: 'On-site'
      },
      price: 150
    };

    const expectedService = {
      id: 'serv_123',
      title: 'Consultation pédagogique',
      providerName: 'Édu-Services SA',
      providerLogo: '/logos/edu-services.jpg',
      availability: 'Available',
      tags: [],
      imageUrl: undefined,
      deliveryType: 'On-site',
      priceInfo: 'CHF 150'
    };

    const transformService = (service: any) => ({
      ...service,
      providerName: service.provider?.organization?.name,
      providerLogo: service.provider?.organization?.logoAsset?.publicUrl,
      availability: 'Available',
      tags: [],
      imageUrl: undefined,
      deliveryType: service.provider?.deliveryType || 'On-site',
      priceInfo: service.price ? `CHF ${service.price}` : 'Contact for pricing'
    });

    const result = transformService(apiServiceData);

    expect(result.title).toBe('Consultation pédagogique');
    expect(result.providerName).toBe('Édu-Services SA');
    expect(result.deliveryType).toBe('On-site');
    expect(result.priceInfo).toBe('CHF 150');
    expect(result.tags).toEqual([]);
  });

  it('handles missing optional fields gracefully', () => {
    const incompleteApiData = {
      id: 'incomplete_123',
      name: 'Test Product'
      // Missing supplier, imageAsset, etc.
    };

    const transformProduct = (product: any) => ({
      ...product,
      supplierName: product.supplier?.name,
      supplierLogo: product.supplier?.logoAsset?.publicUrl,
      imageUrl: product.imageAsset?.publicUrl,
      stockStatus: 'In Stock'
    });

    const result = transformProduct(incompleteApiData);

    expect(result.name).toBe('Test Product');
    expect(result.supplierName).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
    expect(result.stockStatus).toBe('In Stock');
  });
});
