
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { VendorClient, VendorClientReason } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { STANDARD_INPUT_FIELD } from '../../constants';

interface ActiveClientToggleProps {
    vendorId: string;
    orgId: string; // Daycare's org ID
}

const ActiveClientToggle: React.FC<ActiveClientToggleProps> = ({ vendorId, orgId }) => {
    const { t } = useTranslation('dashboard');
    const { vendorClients, updateVendorClientStatus } = useAppContext();
    const { addNotification } = useNotifications();

    const [relationship, setRelationship] = useState<VendorClient | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [reason, setReason] = useState<VendorClientReason | undefined>(undefined);
    const [note, setNote] = useState('');

    useEffect(() => {
        const foundRelationship = vendorClients.find(vc => vc.vendorId === vendorId && vc.orgId === orgId) || null;
        setRelationship(foundRelationship);
        setIsActive(foundRelationship?.isActive || false);
        setReason(foundRelationship?.reason);
        setNote(foundRelationship?.note || '');
    }, [vendorClients, vendorId, orgId]);

    const handleSave = () => {
        if (window.confirm(t('activeClientToggle.confirmSave'))) {
            updateVendorClientStatus(vendorId, orgId, isActive, reason, note);
            addNotification({
                title: t('activeClientToggle.saveSuccess.title'),
                message: t('activeClientToggle.saveSuccess.message'),
                type: 'success'
            });
        }
    };

    const isDirty = (relationship?.isActive || false) !== isActive || (relationship?.reason) !== reason || (relationship?.note || '') !== note;

    return (
        <Card className="p-6 bg-swiss-sand/20 border border-swiss-sand">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">{t('activeClientToggle.title')}</h3>
            <div className="flex items-center justify-between">
                <label htmlFor="activeClientToggle" className="font-medium text-amber-800">{t('activeClientToggle.label')}</label>
                <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${isActive ? 'bg-swiss-mint' : 'bg-gray-300'}`}
                    role="switch"
                    aria-checked={isActive}
                    id="activeClientToggle"
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
             <div className="mt-4">
                <label htmlFor="clientReason" className="block text-sm font-medium text-gray-700 mb-1">{t('activeClientToggle.reasonLabel')}</label>
                <select id="clientReason" name="reason" value={reason || ''} onChange={(e) => setReason(e.target.value as VendorClientReason)} className={STANDARD_INPUT_FIELD}>
                    <option value="">{t('signupPage.placeholders.select')}</option>
                    {Object.values(VendorClientReason).map(r => (
                        <option key={r} value={r}>{t(`vendorClientReasons.${r.replace(/\s+/g, '')}`, r)}</option>
                    ))}
                </select>
            </div>
            <div className="mt-4">
                <label htmlFor="clientNote" className="block text-sm font-medium text-gray-700 mb-1">{t('activeClientToggle.noteLabel')}</label>
                <textarea
                    id="clientNote"
                    name="note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('activeClientToggle.notePlaceholder')}
                    maxLength={280}
                />
            </div>
            <p className="text-xs text-gray-600 mt-2">{t('activeClientToggle.subtext')}</p>
            <Button onClick={handleSave} disabled={!isDirty} variant="secondary" size="sm" className="w-full mt-4">
                {t('buttons.saveChanges')}
            </Button>
        </Card>
    );
};

export default ActiveClientToggle;
