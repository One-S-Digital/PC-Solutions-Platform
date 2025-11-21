import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import ChipInput from '../ui/ChipInput';
import FileUploadZone from '../ui/FileUploadZone';
import {
  STANDARD_INPUT_FIELD,
  SWISS_CANTONS,
  SUGGESTED_PRODUCT_CATEGORIES,
  SUGGESTED_PRODUCT_COMPLIANCE_TAGS,
  SUGGESTED_PRODUCT_AGE_RANGES,
  SUGGESTED_PRODUCT_DELIVERY_METHODS,
} from '../../constants';
import {
  Product,
  ProductAvailabilityStatus,
  StockStatus,
} from '../../types';

export type ProductFormState = {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  priceCurrency: string;
  primaryCategory: string;
  categories: string[];
  tags: string[];
  productHighlights: string[];
  unitOfMeasure: string;
  availabilityStatus: ProductAvailabilityStatus;
  isActive: boolean;
  sku: string;
  vendorSku: string;
  ean: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  stockStatus: StockStatus;
  deliveryLeadTimeDays: string;
  restockCadence: string;
  usageNotes: string;
  packagingDetails: string;
  materials: string;
  complianceTags: string[];
  allergens: string[];
  ageRanges: string[];
  deliveryMethods: string[];
  deliveryFees: DeliveryFeeForm[];
  supportedCantons: string[];
  visibilityStart: string;
  visibilityEnd: string;
  volumePricing: VolumePricingTierForm[];
  variants: ProductVariantForm[];
  galleryAssetIds: string[];
  imageAssetId?: string;
  specSheetAssetId?: string;
  msdsAssetId?: string;
};

type VolumePricingTierForm = {
  id: string;
  minQuantity: string;
  price: string;
};

type DeliveryFeeForm = {
  id: string;
  method: string;
  fee: string;
  currency: string;
};

type ProductVariantForm = {
  id: string;
  name: string;
  sku: string;
  price: string;
  stockQuantity: string;
  stockStatus: StockStatus;
  attributes: string[];
  imageAssetId?: string;
};

const STOCK_STATUS_OPTIONS: StockStatus[] = [
  'In Stock',
  'Low Stock',
  'Out of Stock',
  'On Demand',
];

const AVAILABILITY_OPTIONS: ProductAvailabilityStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'DRAFT',
  'OUT_OF_STOCK',
];

const emptyTier = (): VolumePricingTierForm => ({
  id: `tier-${Date.now()}`,
  minQuantity: '',
  price: '',
});

const emptyVariant = (): ProductVariantForm => ({
  id: `variant-${Date.now()}`,
  name: '',
  sku: '',
  price: '',
  stockQuantity: '',
  stockStatus: 'In Stock',
  attributes: [],
});

const emptyDeliveryFee = (): DeliveryFeeForm => ({
  id: `fee-${Date.now()}`,
  method: '',
  fee: '',
  currency: 'CHF',
});

const defaultFormState: ProductFormState = {
  title: '',
  subtitle: '',
  description: '',
  price: '',
  priceCurrency: 'CHF',
  primaryCategory: '',
  categories: [],
  tags: [],
  productHighlights: [],
  unitOfMeasure: '',
  availabilityStatus: 'ACTIVE',
  isActive: true,
  sku: '',
  vendorSku: '',
  ean: '',
  minOrderQuantity: '',
  maxOrderQuantity: '',
  stockStatus: 'In Stock',
  deliveryLeadTimeDays: '',
  restockCadence: '',
  usageNotes: '',
  packagingDetails: '',
  materials: '',
  complianceTags: [],
  allergens: [],
  ageRanges: [],
  deliveryMethods: [],
  deliveryFees: [],
  supportedCantons: [],
  visibilityStart: '',
  visibilityEnd: '',
  volumePricing: [],
  variants: [],
  galleryAssetIds: [],
  imageAssetId: undefined,
  specSheetAssetId: undefined,
  msdsAssetId: undefined,
};

interface ProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormState) => Promise<void> | void;
  initialProduct?: Product | null;
  isSubmitting?: boolean;
}

const ProductUploadModal: React.FC<ProductUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProduct,
  isSubmitting = false,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [formData, setFormData] = useState<ProductFormState>(defaultFormState);

  const modalTitle = initialProduct
    ? t('dashboard:productUploadModal.editTitle', 'Edit Product')
    : t('dashboard:productUploadModal.addTitle', 'Add Product');

  const sectionLabel = (key: string, fallback: string) =>
    t(`dashboard:productUploadModal.sections.${key}`, fallback);

  const label = (key: string, fallback: string) =>
    t(`dashboard:productUploadModal.labels.${key}`, fallback);

  const helper = (key: string, fallback: string) =>
    t(`dashboard:productUploadModal.helpers.${key}`, fallback);

  const availabilityOptions = useMemo(() => AVAILABILITY_OPTIONS, []);
  const stockOptions = useMemo(() => STOCK_STATUS_OPTIONS, []);

  const hydrateForm = (product?: Product | null): ProductFormState => {
    if (!product) {
      return { ...defaultFormState };
    }

    return {
      title: product.title || '',
      subtitle: product.subtitle || '',
      description: product.description || '',
      price: product.price !== undefined ? String(product.price) : '',
      priceCurrency: product.priceCurrency || 'CHF',
      primaryCategory: product.primaryCategory || product.category || '',
      categories: product.categories || [],
      tags: product.tags || [],
      productHighlights: product.productHighlights || [],
      unitOfMeasure: product.unitOfMeasure || '',
      availabilityStatus: product.availabilityStatus || 'ACTIVE',
      isActive: product.isActive ?? true,
      sku: product.sku || '',
      vendorSku: product.vendorSku || '',
      ean: product.ean || '',
      minOrderQuantity:
        product.minOrderQuantity !== undefined
          ? String(product.minOrderQuantity)
          : '',
      maxOrderQuantity:
        product.maxOrderQuantity !== undefined
          ? String(product.maxOrderQuantity)
          : '',
      stockStatus: (product.stockStatus as StockStatus) || 'In Stock',
      deliveryLeadTimeDays:
        product.deliveryLeadTimeDays !== undefined
          ? String(product.deliveryLeadTimeDays)
          : '',
      restockCadence: product.restockCadence || '',
      usageNotes: product.usageNotes || '',
      packagingDetails: product.packagingDetails || '',
      materials: product.materials || '',
      complianceTags: product.complianceTags || [],
      allergens: product.allergens || [],
      ageRanges: product.ageRanges || [],
      deliveryMethods: product.deliveryMethods || [],
      deliveryFees:
        product.deliveryFees?.map((fee, index) => ({
          id: `${product.id}-fee-${index}`,
          method: fee.method || '',
          fee:
            fee.fee !== undefined && fee.fee !== null
              ? String(fee.fee)
              : '',
          currency: fee.currency || product.priceCurrency || 'CHF',
        })) || [],
      supportedCantons: product.supportedCantons || [],
      visibilityStart: product.visibilityStart || '',
      visibilityEnd: product.visibilityEnd || '',
      volumePricing:
        product.volumePricing?.map((tier, index) => ({
          id: `${product.id}-tier-${index}`,
          minQuantity:
            tier.minQuantity !== undefined && tier.minQuantity !== null
              ? String(tier.minQuantity)
              : '',
          price:
            tier.price !== undefined && tier.price !== null
              ? String(tier.price)
              : '',
        })) || [],
      variants:
        product.variants?.map((variant, index) => ({
          id: `${product.id}-variant-${index}`,
          name: variant.name || '',
          sku: variant.sku || '',
          price:
            variant.price !== undefined && variant.price !== null
              ? String(variant.price)
              : '',
          stockQuantity:
            variant.stockQuantity !== undefined &&
            variant.stockQuantity !== null
              ? String(variant.stockQuantity)
              : '',
          stockStatus: (variant.stockStatus as StockStatus) || 'In Stock',
          attributes: variant.attributes || [],
          imageAssetId: variant.imageAssetId,
        })) || [],
      galleryAssetIds: product.galleryAssetIds || [],
      imageAssetId: product.imageAssetId,
      specSheetAssetId: product.specSheetAssetId,
      msdsAssetId: product.msdsAssetId,
    };
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(hydrateForm(initialProduct));
    } else {
      setFormData({ ...defaultFormState });
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) {
    return null;
  }

  const handleFieldChange = <K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateVolumeTier = <
    K extends keyof VolumePricingTierForm,
    V extends VolumePricingTierForm[K],
  >(
    id: string,
    key: K,
    value: V,
  ) => {
    setFormData((prev) => ({
      ...prev,
      volumePricing: prev.volumePricing.map((tier) =>
        tier.id === id ? { ...tier, [key]: value } : tier,
      ),
    }));
  };

  const updateVariant = <
    K extends keyof ProductVariantForm,
    V extends ProductVariantForm[K],
  >(
    id: string,
    key: K,
    value: V,
  ) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === id ? { ...variant, [key]: value } : variant,
      ),
    }));
  };

  const updateDeliveryFee = <
    K extends keyof DeliveryFeeForm,
    V extends DeliveryFeeForm[K],
  >(
    id: string,
    key: K,
    value: V,
  ) => {
    setFormData((prev) => ({
      ...prev,
      deliveryFees: prev.deliveryFees.map((fee) =>
        fee.id === id ? { ...fee, [key]: value } : fee,
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    await onSubmit(formData);
  };

  const renderChipInput = (
    value: string[],
    field: keyof ProductFormState,
    options?: readonly string[],
    allowCustomValues = true,
    placeholder?: string,
  ) => (
    <ChipInput<string>
      selectedChips={value}
      availableOptions={options ? (options as string[]) : undefined}
      onChange={(chips) => handleFieldChange(field, chips)}
      placeholder={placeholder}
      allowCustomValues={allowCustomValues}
    />
  );

    const Section: React.FC<{ title: string; description?: string }> = ({
      title,
      description,
      children,
    }) => (
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-swiss-charcoal">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {children}
      </section>
    );

    return (
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6"
        onClick={onClose}
      >
        <div
          className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-400">
                {t(
                  'dashboard:productUploadModal.titlePill',
                  'Product Intake',
                )}
              </p>
              <h2 className="text-2xl font-bold text-swiss-charcoal">
                {modalTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              aria-label={t('common:buttons.close', 'Close')}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form className="flex-1 flex flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              <Section
                title={sectionLabel('basics', 'Product basics')}
                description={helper(
                  'basics',
                  'Describe what daycares should know at a glance.',
                )}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('title', 'Product name')} *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        handleFieldChange('title', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      maxLength={120}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('subtitle', 'Short subtitle')}
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) =>
                        handleFieldChange('subtitle', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      maxLength={160}
                      placeholder={helper(
                        'subtitlePlaceholder',
                        'Highlight a key benefit',
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('description', 'Description')} *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleFieldChange('description', e.target.value)
                      }
                      className={`${STANDARD_INPUT_FIELD} min-h-[120px]`}
                      placeholder={helper(
                        'descriptionPlaceholder',
                        'Explain how the product helps daycares.',
                      )}
                      required
                    />
                  </div>
                </div>
              </Section>

              <Section
                title={sectionLabel('categories', 'Categories & compliance')}
                description={helper(
                  'categories',
                  'Help daycares find your product faster.',
                )}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('primaryCategory', 'Primary category')}
                    </label>
                    <input
                      type="text"
                      value={formData.primaryCategory}
                      onChange={(e) =>
                        handleFieldChange('primaryCategory', e.target.value)
                      }
                      list="product-category-suggestions"
                      className={STANDARD_INPUT_FIELD}
                      placeholder={helper(
                        'primaryCategoryPlaceholder',
                        'e.g., Educational Toys',
                      )}
                    />
                    <datalist id="product-category-suggestions">
                      {(SUGGESTED_PRODUCT_CATEGORIES as string[]).map(
                        (cat) => (
                          <option key={cat} value={cat} />
                        ),
                      )}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('categories', 'Additional categories')}
                    </label>
                    {renderChipInput(
                      formData.categories,
                      'categories',
                      SUGGESTED_PRODUCT_CATEGORIES,
                      true,
                      helper(
                        'categoriesPlaceholder',
                        'Add tags like “Furniture” or “Kitchen”',
                      ),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('tags', 'Discovery tags')}
                    </label>
                    {renderChipInput(
                      formData.tags,
                      'tags',
                      undefined,
                      true,
                      helper('tagsPlaceholder', 'Eco-friendly, Swiss-made, etc.'),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('productHighlights', 'Highlights')}
                    </label>
                    {renderChipInput(
                      formData.productHighlights,
                      'productHighlights',
                      undefined,
                      true,
                      helper(
                        'highlightsPlaceholder',
                        'Short benefits like “Ready-to-ship”',
                      ),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('complianceTags', 'Compliance & safety')}
                    </label>
                    {renderChipInput(
                      formData.complianceTags,
                      'complianceTags',
                      SUGGESTED_PRODUCT_COMPLIANCE_TAGS,
                      true,
                      helper('compliancePlaceholder', 'EN-71, FSC, Organic...'),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('ageRanges', 'Target age ranges')}
                    </label>
                    {renderChipInput(
                      formData.ageRanges,
                      'ageRanges',
                      SUGGESTED_PRODUCT_AGE_RANGES,
                      true,
                      helper('ageRangesPlaceholder', 'Select or add custom ranges'),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('allergens', 'Allergens')}
                    </label>
                    {renderChipInput(
                      formData.allergens,
                      'allergens',
                      undefined,
                      true,
                      helper('allergensPlaceholder', 'Gluten, nuts, dairy...'),
                    )}
                  </div>
                </div>
              </Section>

              <Section
                title={sectionLabel('pricing', 'Pricing & inventory')}
                description={helper(
                  'pricing',
                  'Share purchasing details daycares need for procurement.',
                )}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('price', 'Base price (CHF)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.05"
                      value={formData.price}
                      onChange={(e) =>
                        handleFieldChange('price', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('priceCurrency', 'Currency')}
                    </label>
                    <input
                      type="text"
                      value={formData.priceCurrency}
                      onChange={(e) =>
                        handleFieldChange('priceCurrency', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      maxLength={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('unitOfMeasure', 'Unit of measure')}
                    </label>
                    <input
                      type="text"
                      value={formData.unitOfMeasure}
                      onChange={(e) =>
                        handleFieldChange('unitOfMeasure', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      placeholder={helper(
                        'unitPlaceholder',
                        'Per item, per case, etc.',
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('minOrderQuantity', 'Minimum order qty')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minOrderQuantity}
                      onChange={(e) =>
                        handleFieldChange('minOrderQuantity', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('maxOrderQuantity', 'Maximum order qty')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxOrderQuantity}
                      onChange={(e) =>
                        handleFieldChange('maxOrderQuantity', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('deliveryLeadTimeDays', 'Lead time (days)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.deliveryLeadTimeDays}
                      onChange={(e) =>
                        handleFieldChange('deliveryLeadTimeDays', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('stockStatus', 'Stock status')}
                    </label>
                    <select
                      value={formData.stockStatus}
                      onChange={(e) =>
                        handleFieldChange(
                          'stockStatus',
                          e.target.value as StockStatus,
                        )
                      }
                      className={STANDARD_INPUT_FIELD}
                    >
                      {stockOptions.map((option) => (
                        <option key={option} value={option}>
                          {t(
                            `dashboard:stockStatus.${option
                              .replace(/\s+/g, '')
                              .toLowerCase()}`,
                            option,
                          )}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('availabilityStatus', 'Availability state')}
                    </label>
                    <select
                      value={formData.availabilityStatus}
                      onChange={(e) =>
                        handleFieldChange(
                          'availabilityStatus',
                          e.target.value as ProductAvailabilityStatus,
                        )
                      }
                      className={STANDARD_INPUT_FIELD}
                    >
                      {availabilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {t(
                            `dashboard:productUploadModal.availability.${option.toLowerCase()}`,
                            option,
                          )}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center mt-6 space-x-3">
                    <input
                      id="product-is-active"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        handleFieldChange('isActive', e.target.checked)
                      }
                      className="h-4 w-4 text-swiss-mint border-gray-300 rounded"
                    />
                    <label
                      htmlFor="product-is-active"
                      className="text-sm text-gray-700"
                    >
                      {label('isActive', 'Publish immediately')}
                    </label>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-swiss-charcoal">
                      {label('volumePricing', 'Volume pricing tiers')}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={PlusCircleIcon}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          volumePricing: [
                            ...prev.volumePricing,
                            emptyTier(),
                          ],
                        }))
                      }
                    >
                      {t('common:buttons.add', 'Add')}
                    </Button>
                  </div>
                  {formData.volumePricing.length === 0 && (
                    <p className="text-sm text-gray-500">
                      {helper(
                        'volumePricingEmpty',
                        'Add tiers to incentivize larger daycare orders.',
                      )}
                    </p>
                  )}
                  {formData.volumePricing.map((tier) => (
                    <div
                      key={tier.id}
                      className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end bg-swiss-mint/5 rounded-lg p-4"
                    >
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label('volumePricingMin', 'Min quantity')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={tier.minQuantity}
                          onChange={(e) =>
                            updateVolumeTier(
                              tier.id,
                              'minQuantity',
                              e.target.value,
                            )
                          }
                          className={STANDARD_INPUT_FIELD}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label('volumePricingPrice', 'Unit price')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={tier.price}
                          onChange={(e) =>
                            updateVolumeTier(tier.id, 'price', e.target.value)
                          }
                          className={STANDARD_INPUT_FIELD}
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              volumePricing: prev.volumePricing.filter(
                                (t) => t.id !== tier.id,
                              ),
                            }))
                          }
                          aria-label={t('common:buttons.delete', 'Delete')}
                        >
                          <TrashIcon className="w-5 h-5 text-swiss-coral" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-swiss-charcoal">
                      {label('variants', 'Variants')}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={PlusCircleIcon}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          variants: [...prev.variants, emptyVariant()],
                        }))
                      }
                    >
                      {t('common:buttons.add', 'Add')}
                    </Button>
                  </div>
                  {formData.variants.length === 0 && (
                    <p className="text-sm text-gray-500">
                      {helper(
                        'variantsEmpty',
                        'Track options like size, colour, or finish.',
                      )}
                    </p>
                  )}
                  {formData.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="space-y-3 rounded-lg border border-gray-100 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantName', 'Variant name')}
                          </label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) =>
                              updateVariant(variant.id, 'name', e.target.value)
                            }
                            className={STANDARD_INPUT_FIELD}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantSku', 'SKU')}
                          </label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(variant.id, 'sku', e.target.value)
                            }
                            className={STANDARD_INPUT_FIELD}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantPrice', 'Price')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.05"
                            value={variant.price}
                            onChange={(e) =>
                              updateVariant(variant.id, 'price', e.target.value)
                            }
                            className={STANDARD_INPUT_FIELD}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantStock', 'Stock qty')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variant.stockQuantity}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                'stockQuantity',
                                e.target.value,
                              )
                            }
                            className={STANDARD_INPUT_FIELD}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantStockStatus', 'Stock status')}
                          </label>
                          <select
                            value={variant.stockStatus}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                'stockStatus',
                                e.target.value as StockStatus,
                              )
                            }
                            className={STANDARD_INPUT_FIELD}
                          >
                            {stockOptions.map((status) => (
                              <option key={status} value={status}>
                                {t(
                                  `dashboard:stockStatus.${status
                                    .replace(/\s+/g, '')
                                    .toLowerCase()}`,
                                  status,
                                )}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label('variantAttributes', 'Attributes')}
                          </label>
                          <ChipInput<string>
                            selectedChips={variant.attributes}
                            onChange={(chips) =>
                              updateVariant(variant.id, 'attributes', chips)
                            }
                            placeholder={helper(
                              'variantAttributesPlaceholder',
                              'Colour, Size, Finish...',
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              variants: prev.variants.filter(
                                (item) => item.id !== variant.id,
                              ),
                            }))
                          }
                          aria-label={t('common:buttons.delete', 'Delete')}
                        >
                          <TrashIcon className="w-5 h-5 text-swiss-coral" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                title={sectionLabel('logistics', 'Logistics & delivery')}
                description={helper(
                  'logistics',
                  'Clarify how and where daycares receive orders.',
                )}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('deliveryMethods', 'Delivery methods')}
                    </label>
                    {renderChipInput(
                      formData.deliveryMethods,
                      'deliveryMethods',
                      SUGGESTED_PRODUCT_DELIVERY_METHODS,
                      true,
                      helper(
                        'deliveryMethodsPlaceholder',
                        'Courier, pickup, installation...',
                      ),
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('supportedCantons', 'Cantons served')}
                    </label>
                    {renderChipInput(
                      formData.supportedCantons,
                      'supportedCantons',
                      SWISS_CANTONS,
                      true,
                      helper('cantonsPlaceholder', 'Add all cantons you cover'),
                    )}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label('visibilityStart', 'Visibility start')}
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.visibilityStart?.slice(0, 16) || ''}
                        onChange={(e) =>
                          handleFieldChange('visibilityStart', e.target.value)
                        }
                        className={STANDARD_INPUT_FIELD}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label('visibilityEnd', 'Visibility end')}
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.visibilityEnd?.slice(0, 16) || ''}
                        onChange={(e) =>
                          handleFieldChange('visibilityEnd', e.target.value)
                        }
                        className={STANDARD_INPUT_FIELD}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-swiss-charcoal">
                      {label('deliveryFees', 'Delivery fees')}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={PlusCircleIcon}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          deliveryFees: [
                            ...prev.deliveryFees,
                            emptyDeliveryFee(),
                          ],
                        }))
                      }
                    >
                      {t('common:buttons.add', 'Add')}
                    </Button>
                  </div>
                  {formData.deliveryFees.length === 0 && (
                    <p className="text-sm text-gray-500">
                      {helper(
                        'deliveryFeesEmpty',
                        'List surcharge per method if applicable.',
                      )}
                    </p>
                  )}
                  {formData.deliveryFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end bg-gray-50 rounded-lg p-4"
                    >
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label('deliveryFeeMethod', 'Method')}
                        </label>
                        <input
                          type="text"
                          value={fee.method}
                          onChange={(e) =>
                            updateDeliveryFee(fee.id, 'method', e.target.value)
                          }
                          className={STANDARD_INPUT_FIELD}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label('deliveryFeeAmount', 'Fee')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={fee.fee}
                          onChange={(e) =>
                            updateDeliveryFee(fee.id, 'fee', e.target.value)
                          }
                          className={STANDARD_INPUT_FIELD}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={fee.currency}
                          onChange={(e) =>
                            updateDeliveryFee(fee.id, 'currency', e.target.value)
                          }
                          className={STANDARD_INPUT_FIELD}
                          maxLength={3}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              deliveryFees: prev.deliveryFees.filter(
                                (item) => item.id !== fee.id,
                              ),
                            }))
                          }
                          aria-label={t('common:buttons.delete', 'Delete')}
                        >
                          <TrashIcon className="w-5 h-5 text-swiss-coral" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                title={sectionLabel('content', 'Media & documentation')}
                description={helper(
                  'content',
                  'Upload visuals and compliance files daycares can reference.',
                )}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label('primaryImage', 'Primary image')}
                    </label>
                    <FileUploadZone
                      label={label(
                        'uploadPrimaryImage',
                        'Upload primary image',
                      )}
                      assetKind="PRODUCT_IMAGE"
                      acceptedMimeTypes="image/*"
                      onUploadSuccess={(asset) =>
                        setFormData((prev) => ({
                          ...prev,
                          imageAssetId: asset?.id,
                        }))
                      }
                    />
                    {formData.imageAssetId && (
                      <p className="text-xs text-gray-500 mt-2">
                        {helper('assetSaved', 'Saved asset ID')}:{' '}
                        {formData.imageAssetId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label('gallery', 'Gallery images')}
                    </label>
                    <FileUploadZone
                      label={label('uploadGallery', 'Upload gallery image')}
                      assetKind="PRODUCT_GALLERY"
                      acceptedMimeTypes="image/*"
                      onUploadSuccess={(asset) =>
                        setFormData((prev) => ({
                          ...prev,
                          galleryAssetIds: asset?.id
                            ? [...prev.galleryAssetIds, asset.id]
                            : prev.galleryAssetIds,
                        }))
                      }
                    />
                    {formData.galleryAssetIds.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-gray-600">
                        {formData.galleryAssetIds.map((assetId) => (
                          <li
                            key={assetId}
                            className="flex items-center justify-between bg-gray-50 rounded px-2 py-1"
                          >
                            <span className="truncate">{assetId}</span>
                            <button
                              type="button"
                              className="text-swiss-coral hover:underline ml-3"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  galleryAssetIds: prev.galleryAssetIds.filter(
                                    (id) => id !== assetId,
                                  ),
                                }))
                              }
                            >
                              {t('common:buttons.remove', 'Remove')}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label('specSheet', 'Spec sheet / brochure')}
                    </label>
                    <FileUploadZone
                      label={label('uploadSpecSheet', 'Upload spec sheet')}
                      assetKind="PRODUCT_SPEC_SHEET"
                      acceptedMimeTypes="application/pdf"
                      onUploadSuccess={(asset) =>
                        setFormData((prev) => ({
                          ...prev,
                          specSheetAssetId: asset?.id,
                        }))
                      }
                    />
                    {formData.specSheetAssetId && (
                      <p className="text-xs text-gray-500 mt-2">
                        {helper('assetSaved', 'Saved asset ID')}:{' '}
                        {formData.specSheetAssetId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label('msds', 'MSDS / safety data')}
                    </label>
                    <FileUploadZone
                      label={label('uploadMsds', 'Upload safety document')}
                      assetKind="PRODUCT_MSDS"
                      acceptedMimeTypes="application/pdf"
                      onUploadSuccess={(asset) =>
                        setFormData((prev) => ({
                          ...prev,
                          msdsAssetId: asset?.id,
                        }))
                      }
                    />
                    {formData.msdsAssetId && (
                      <p className="text-xs text-gray-500 mt-2">
                        {helper('assetSaved', 'Saved asset ID')}:{' '}
                        {formData.msdsAssetId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('usageNotes', 'Usage notes')}
                    </label>
                    <textarea
                      value={formData.usageNotes}
                      onChange={(e) =>
                        handleFieldChange('usageNotes', e.target.value)
                      }
                      className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('materials', 'Materials')}
                    </label>
                    <textarea
                      value={formData.materials}
                      onChange={(e) =>
                        handleFieldChange('materials', e.target.value)
                      }
                      className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('packagingDetails', 'Packaging details')}
                    </label>
                    <textarea
                      value={formData.packagingDetails}
                      onChange={(e) =>
                        handleFieldChange('packagingDetails', e.target.value)
                      }
                      className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label('restockCadence', 'Restock cadence')}
                    </label>
                    <textarea
                      value={formData.restockCadence}
                      onChange={(e) =>
                        handleFieldChange('restockCadence', e.target.value)
                      }
                      className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                    />
                  </div>
                </div>
              </Section>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button
                type="button"
                variant="light"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('common:buttons.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common:buttons.saving', 'Saving...')
                  : initialProduct
                    ? t('common:buttons.saveChanges', 'Save changes')
                    : t('common:buttons.add', 'Add')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
};

export default ProductUploadModal;
