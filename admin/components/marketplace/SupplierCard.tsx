
import React from 'react';
import { Organization, Product } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { BuildingStorefrontIcon, StarIcon, EyeIcon, TagIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../../constants'; // To derive categories
import { useTranslation } from 'react-i18next';

interface SupplierCardProps {
  supplier: Organization;
  onViewProfile: (supplierId: string) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onViewProfile }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const renderRatingStars = (rating?: number) => {
    const totalStars = 5;
    const fullStars = Math.floor(rating || 0);
    const halfStar = (rating || 0) % 1 >= 0.5 ? 1 : 0;
    const emptyStars = totalStars - fullStars - halfStar;
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => <StarIcon key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
        {/* Basic half star, can be improved with a proper half-star icon */}
        {halfStar > 0 && <StarIcon key="half" className="w-4 h-4 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />}
        {[...Array(emptyStars)].map((_, i) => <StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />)}
        {rating && <span className="ml-1.5 text-xs text-gray-500">({rating.toFixed(1)})</span>}
      </div>
    );
  };

  // Derive main categories from supplier's products or tags
  const getSupplierMainCategories = () => {
    const productCategories = MOCK_PRODUCTS.filter(p => p.supplierId === supplier.id)
                                          .map(p => p.category);
    const uniqueProductCategories = [...new Set(productCategories)];
    
    if (uniqueProductCategories.length > 0) {
        return uniqueProductCategories.slice(0, 2).join(', ') + (uniqueProductCategories.length > 2 ? '...' : '');
    }
    if (supplier.tags && supplier.tags.length > 0) {
        return supplier.tags.slice(0, 2).join(', ') + (supplier.tags.length > 2 ? '...' : '');
    }
    return 'Various Products'; // Fallback, consider translating
  };

  const mainCategoriesTagline = getSupplierMainCategories();

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="relative p-4 border-b border-gray-200 bg-gray-50/50">
        <img 
            src={supplier.logoUrl || `https://ui-avatars.com/api/?name=${supplier.name.replace(' ', '+')}&background=E0E7FF&color=4F46E5&size=128`} 
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
            <BuildingStorefrontIcon className="w-3.5 h-3.5 mr-1 opacity-70"/> {supplier.region}
        </p>
        <div className="text-center mb-3">
            {renderRatingStars(supplier.rating)}
        </div>
        
        <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-2 text-center">
            <TagIcon className="w-4 h-4 inline mr-1 opacity-60" /> 
            {t('supplierCard.specializesIn', { mainCategoriesTagline })}
        </p>
        
        <div className="mt-auto">
          <Button 
            variant="primary" 
            size="sm" 
            className="w-full" 
            leftIcon={EyeIcon}
            onClick={() => onViewProfile(supplier.id)}
          >
            {t('supplierCard.viewProfileAndProducts')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SupplierCard;
