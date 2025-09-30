

// Implement PromoCodeManagerSettings.tsx
// Placeholder - This will be implemented in subsequent steps.
import React, { useState } from 'react';
import { SettingsFormData, UserRole, PromoCode } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { TagIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// import AddPromoCodeModal from '../AddPromoCodeModal'; // To be created

interface PromoCodeManagerSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PromoCodeManagerSettings: React.FC<PromoCodeManagerSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  const handleAddOrUpdatePromo = (promo: PromoCode) => {
    const existingIndex = (settings.promoCodes || []).findIndex(p => p.id === promo.id);
    let updatedPromos;
    if (existingIndex > -1) {
      updatedPromos = (settings.promoCodes || []).map((p, index) => index === existingIndex ? promo : p);
    } else {
      updatedPromos = [...(settings.promoCodes || []), { ...promo, id: `promo-${Date.now()}` }];
    }
    onChange('promoCodes', updatedPromos);
  };

  const handleDeletePromo = (promoId: string) => {
    if (window.confirm(t('settingsPromoCodeManager.confirmDelete'))) {
      const updatedPromos = (settings.promoCodes || []).filter(p => p.id !== promoId);
      onChange('promoCodes', updatedPromos);
    }
  };
  
  const getDiscountText = (promo: PromoCode) => {
    switch(promo.discountType) {
        case 'Percentage': return t('settingsPromoCodeManager.discountTypes.percentage', { value: promo.value });
        case 'FixedAmount': return t('settingsPromoCodeManager.discountTypes.fixedAmount', { value: promo.value });
        case 'FreeMinutes': return t('settingsPromoCodeManager.discountTypes.freeMinutes', { value: promo.value });
        default: return promo.description || `${promo.value}`;
    }
  }

  return (
    <SettingsSectionWrapper title={t('settingsPage.promoCodeManager')} icon={TagIcon}>
      <div className="flex justify-end mb-4">
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => { setEditingPromo(null); setIsModalOpen(true); }}>
          {t('settingsPromoCodeManager.addNewCode')}
        </Button>
      </div>
      
      {(settings.promoCodes || []).length === 0 ? (
        <p className="text-gray-500 text-center py-4">{t('settingsPromoCodeManager.noCodesYet')}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.discountOffer')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.expiry')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(settings.promoCodes || []).map(promo => (
                <tr key={promo.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-swiss-charcoal">{promo.code}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {getDiscountText(promo)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(promo.expiryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        promo.status === 'Active' ? 'bg-green-100 text-green-700' :
                        promo.status === 'Expired' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                        {promo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="xs" onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }}>
                        <PencilSquareIcon className="w-4 h-4"/> {t('buttons.edit')}
                    </Button>
                    <Button variant="ghost" size="xs" className="text-swiss-coral" onClick={() => handleDeletePromo(promo.id)}>
                        <TrashIcon className="w-4 h-4"/> {t('buttons.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* <AddPromoCodeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddOrUpdatePromo}
        existingPromo={editingPromo}
        userRole={userRole}
      /> */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">{editingPromo ? t('settingsPromoCodeManager.addEditModal.editTitle') : t('settingsPromoCodeManager.addEditModal.addTitle')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('settingsPromoCodeManager.addEditModal.placeholder')}</p>
                  <div className="flex justify-end space-x-2">
                      <Button variant="light" onClick={() => setIsModalOpen(false)}>{t('buttons.cancel')}</Button>
                      <Button variant="primary" onClick={() => { /* Mock submit */ setIsModalOpen(false); }}>{t('settingsPromoCodeManager.addEditModal.save')}</Button>
                  </div>
              </div>
          </div>
      )}

    </SettingsSectionWrapper>
  );
};

export default PromoCodeManagerSettings;