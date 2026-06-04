import React from 'react';
import { Organization } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import RatingStars from '../ui/RatingStars';
import { BuildingStorefrontIcon, EyeIcon, TagIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { getAvatarFallback } from '../../utils/avatar';

interface SupplierCardProps {
  supplier: Organization;
  onViewProfile: (supplierId: string) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onViewProfile }) => {
  const { t } = useTranslation(['dashboard', 'common']);

  // Get main categories from supplier's data
  const getSupplierMainCategories = () => {
    // First check productCategories (new flexible tags)
    if (supplier.productCategories && supplier.productCategories.length > 0) {
      return supplier.productCategories.slice(0, 2).join(', ') + 
        (supplier.productCategories.length > 2 ? '...' : '');
    }
    
    // Then check products if available
    if (supplier.products && supplier.products.length > 0) {
      const productCategories = supplier.products
        .map(p => p.category || (p.categories && p.categories[0]))
        .filter(Boolean);
      const uniqueCategories = [...new Set(productCategories)];
      
      if (uniqueCategories.length > 0) {
        return uniqueCategories.slice(0, 2).join(', ') + 
          (uniqueCategories.length > 2 ? '...' : '');
      }
    }
    
    // Check legacy productCategory
    if (supplier.productCategory) {
      return supplier.productCategory;
    }
    
    // Check tags
    if (supplier.tags && supplier.tags.length > 0) {
      return supplier.tags.slice(0, 2).join(', ') + 
        (supplier.tags.length > 2 ? '...' : '');
    }
    
    return t('common:marketplace.variousProducts', 'Various Products');
  };

  const mainCategoriesTagline = getSupplierMainCategories();

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="relative p-4 border-b border-gray-200 bg-gray-50/50">
        <img 
          src={supplier.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(supplier.name)}&background=E0E7FF&color=4F46E5&size=128`} 
          alt={`${supplier.name} logo`} 
          className="w-20 h-20 rounded-full mx-auto object-contain border-2 border-white shadow-md bg-white"
        />
        {supplier.badges && supplier.badges.length > 0 && (
          <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
            supplier.badges[0].toLowerCase().includes('verified') ? 'bg-green-100 text-green-700' :
            supplier.badges[0].toLowerCase().includes('promo') ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {supplier.badges[0]}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-swiss-charcoal mb-1 text-center group-hover:text-swiss-mint transition-colors">
          {supplier.name}
        </h3>
        <p className="text-xs text-gray-500 text-center mb-2 flex items-center justify-center">
          <BuildingStorefrontIcon className="w-3.5 h-3.5 mr-1 opacity-70"/> {supplier.region || 'Switzerland'}
        </p>
        <div className="text-center mb-3 flex justify-center">
          <RatingStars rating={supplier.rating} />
        </div>
        
        <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-2 text-center">
          <TagIcon className="w-4 h-4 inline mr-1 opacity-60" /> 
          {t('common:supplierCard.specializesIn', { mainCategoriesTagline })}
        </p>
        
        <div className="mt-auto">
          <Button 
            variant="primary" 
            size="sm" 
            className="w-full" 
            leftIcon={EyeIcon}
            onClick={() => onViewProfile(supplier.id)}
          >
            {t('common:supplierCard.viewProfileAndProducts')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SupplierCard;
