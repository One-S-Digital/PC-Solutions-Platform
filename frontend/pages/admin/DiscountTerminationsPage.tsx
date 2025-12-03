import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { VendorClient, VendorClientReason, Organization } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { TagIcon, CheckCircleIcon, ShieldExclamationIcon, InboxIcon } from '@heroicons/react/24/outline';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DiscountTerminationsPage: React.FC = () => {
    const { t, i18n } = useTranslation(['admin', 'common']);
    const { vendorClients, vendorClientsLoading, updateVendorClientStatus } = useAppContext();
    const { authenticatedRequest } = useAuthenticatedApi();
    
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [orgsLoading, setOrgsLoading] = useState(true);

    const fetchOrganizations = useCallback(async () => {
        setOrgsLoading(true);
        try {
            const response = await authenticatedRequest<Organization[]>('/compat/organizations');
            if (response.success && response.data) {
                setOrganizations(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch organizations:', err);
        } finally {
            setOrgsLoading(false);
        }
    }, [authenticatedRequest]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    // In a real app, this would come from actual churned organization data
    const churnedDaycareId = 'orgOtherFoundation1';

    const terminationQueue = useMemo(() => {
        return vendorClients.filter(vc => vc.isActive && vc.orgId === churnedDaycareId);
    }, [vendorClients]);
    
    const allActiveClients = useMemo(() => {
        return vendorClients.filter(vc => vc.isActive && vc.orgId !== churnedDaycareId);
    }, [vendorClients, churnedDaycareId]);

    const handleSendNotices = () => {
        alert(t('discountTerminations.actions.sendNoticesAlert', { count: terminationQueue.length }));
    };

    const handleMarkCompleted = async (clientId: string) => {
        const client = vendorClients.find(vc => vc.id === clientId);
        if (client) {
            await updateVendorClientStatus(client.vendorId, client.orgId, false, VendorClientReason.TERMINATED, "Terminated due to daycare churn.");
        }
    };
    
    const renderTable = (data: VendorClient[], titleKey: string, emptyKey: string) => {
        const getVendorName = (vendorId: string) => organizations.find(o => o.id === vendorId)?.name || vendorId;
        const getDaycareName = (orgId: string) => organizations.find(o => o.id === orgId)?.name || orgId;

        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t(titleKey)}</h2>
                {data.length === 0 ? (
                     <div className="text-center py-10 text-gray-500">
                        <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        {t(emptyKey)}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('discountTerminations.table.vendor')}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('discountTerminations.table.daycare')}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('discountTerminations.table.activeSince')}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('discountTerminations.table.reason')}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('discountTerminations.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map(vc => (
                                    <tr key={vc.id}>
                                        <td className="px-4 py-3 font-medium">{getVendorName(vc.vendorId)}</td>
                                        <td className="px-4 py-3">{getDaycareName(vc.orgId)}</td>
                                        <td className="px-4 py-3">{new Date(vc.markedAt).toLocaleDateString(i18n.language)}</td>
                                        <td className="px-4 py-3">{vc.reason ? t(`vendorClientReasons.${vc.reason.replace(/\s+/g, '')}`, vc.reason) : 'N/A'}</td>
                                        <td className="px-4 py-3 space-x-2">
                                            {terminationQueue.includes(vc) && (
                                                 <Button variant="secondary" size="xs" onClick={() => handleMarkCompleted(vc.id)}>{t('discountTerminations.actions.markCompleted')}</Button>
                                            )}
                                            <Button variant="outline" size="xs">{t('common:buttons.viewDetails')}</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        );
    };

    const loading = vendorClientsLoading || orgsLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
                <TagIcon className="w-8 h-8 mr-3 text-swiss-mint" />
                {t('dashboard:sidebar.discountTerminations')}
            </h1>

            {/* Termination Queue */}
            <Card className="p-6 bg-swiss-coral/10 border-l-4 border-swiss-coral">
                 <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-swiss-coral mb-2 flex items-center">
                            <ShieldExclamationIcon className="w-6 h-6 mr-2"/>
                            {t('discountTerminations.queue.title')}
                        </h2>
                        <p className="text-sm text-gray-700">{t('discountTerminations.queue.description')}</p>
                    </div>
                    {terminationQueue.length > 0 && (
                        <Button variant="danger" onClick={handleSendNotices} className="mt-3 sm:mt-0">
                            {t('discountTerminations.actions.sendNotices', { count: terminationQueue.length })}
                        </Button>
                    )}
                 </div>
                 <div className="mt-4">
                    {renderTable(terminationQueue, t('discountTerminations.queue.tableTitle'), 'discountTerminations.queue.empty')}
                 </div>
            </Card>

            {/* All Active Clients */}
             <Card className="p-6">
                 <h2 className="text-xl font-semibold text-swiss-charcoal mb-2 flex items-center">
                    <CheckCircleIcon className="w-6 h-6 mr-2 text-swiss-mint"/>
                    {t('discountTerminations.allActive.title')}
                </h2>
                <p className="text-sm text-gray-600 mb-4">{t('discountTerminations.allActive.description')}</p>
                 {renderTable(allActiveClients, t('discountTerminations.allActive.tableTitle'), 'discountTerminations.allActive.empty')}
            </Card>

        </div>
    );
};

export default DiscountTerminationsPage;
