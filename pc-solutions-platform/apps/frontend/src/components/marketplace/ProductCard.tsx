import React from 'react';
import { SwissCard, SwissButton, Badge } from '@repo/ui';
import { Product } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t } = useTranslation();

  const formatPrice = (price?: number) => {
    if (!price) return t('marketplace.priceOnRequest', 'Price on request');
    return `CHF ${price.toFixed(2)}`;
  };

  return (
    <SwissCard className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <div className="aspect-square bg-surface-2 rounded-lg mb-4 overflow-hidden">
        {product.imageAsset ? (
          <img
            src={product.imageAsset.publicUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-semibold text-text-default line-clamp-2">
            {product.title}
          </h3>
          {product.category && (
            <Badge variant="secondary" className="mt-1">
              {product.category}
            </Badge>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-text-secondary line-clamp-3 mb-4">
            {product.description}
          </p>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Supplier Info */}
        {product.supplier && (
          <div className="text-xs text-text-secondary mb-4">
            {t('marketplace.supplier', 'Supplier')}: {product.supplier.name}
          </div>
        )}

        {/* Price and Actions */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-text-default">
              {formatPrice(product.price)}
            </span>
            {!product.isActive && (
              <Badge variant="danger">
                {t('marketplace.inactive', 'Inactive')}
              </Badge>
            )}
          </div>

          <SwissButton
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onAddToCart(product.id)}
            disabled={!product.isActive}
          >
            {t('marketplace.addToCart', 'Add to Cart')}
          </SwissButton>
        </div>
      </div>
    </SwissCard>
  );
}