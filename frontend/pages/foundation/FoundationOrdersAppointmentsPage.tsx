

import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { ShoppingCartIcon, CalendarDaysIcon, InboxIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { Order, ServiceRequest, OrderRequestStatus, ServiceRequestStatus, UserRole } from '../../types';
import { MOCK_ORDERS, MOCK_ORGANIZATIONS } from '../../constants';
import { useTranslation } from 'react-i18next';
import { useMessaging } from '../../contexts/MessagingContext';
import { useNavigate } from 'react-router-dom';

const FoundationOrdersAppointmentsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser, serviceRequests } = useAppContext();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { startOrGetConversation } = useMessaging();
  const navigate = useNavigate();

  const foundationOrgId = currentUser?.orgId;

  const productOrders = useMemo(() => {
    if (!foundationOrgId) return [];
    return MOCK_ORDERS.filter(order => order.foundationOrgId === foundationOrgId);
  }, [foundationOrgId]);

  const serviceAppointments = useMemo(() => {
    if (!foundationOrgId) return [];
    return serviceRequests.filter(req => req.foundationOrgId === foundationOrgId);
  }, [foundationOrgId, serviceRequests]);

  const getOrderStatusClass = (status: OrderRequestStatus) => {
    switch (status) {
      case OrderRequestStatus.SUBMITTED: return 'bg-swiss-coral/20 text-swiss-coral';
      case OrderRequestStatus.ACCEPTED: return 'bg-swiss-mint/20 text-swiss-mint'; // Light Mint
      case OrderRequestStatus.PROCESSING: return 'bg-swiss-sand/30 text-amber-700';
      case OrderRequestStatus.SHIPPED: return 'bg-swiss-teal/20 text-swiss-teal';
      case OrderRequestStatus.FULFILLED: return 'bg-swiss-mint text-white'; // Solid Mint
      case OrderRequestStatus.CANCELLED:
      case OrderRequestStatus.DECLINED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getServiceStatusClass = (status: ServiceRequestStatus) => {
    switch (status) {
      case ServiceRequestStatus.NEW: return 'bg-swiss-coral/20 text-swiss-coral';
      case ServiceRequestStatus.IN_REVIEW: return 'bg-swiss-sand/30 text-amber-700';
      case ServiceRequestStatus.ACCEPTED:
      case ServiceRequestStatus.SCHEDULED:
         return 'bg-swiss-mint/20 text-swiss-mint'; // Light Mint
      case ServiceRequestStatus.COMPLETED: return 'bg-swiss-mint text-white'; // Solid Mint
      case ServiceRequestStatus.REJECTED:
      case ServiceRequestStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const handleSendMessageToPartner = (partnerOrgId: string, partnerName: string, partnerRole: UserRole) => {
    const partnerUser = null; // Production: Fetch partner user from API
    if (!partnerUser) {
        alert(`Could not find a user to message for ${partnerName}.`);
        return;
    }
    const conversationId = startOrGetConversation(partnerUser.id, partnerUser.name, partnerUser.role);
    navigate(`/messages/${conversationId}`);
  };

  const ProductOrdersView = () => (
    <Card className="p-4 mt-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-swiss-charcoal">{t('foundationOrdersAppointmentsPage.productOrdersTitle')}</h3>
        <Button variant="outline" size="sm" onClick={() => alert(t('foundationOrdersAppointmentsPage.exportCsvProductAlert'))}>{t('foundationOrdersAppointmentsPage.exportCsvButton')}</Button>
      </div>
      {productOrders.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
            <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            {t('foundationOrdersAppointmentsPage.noProductOrders')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.refNo')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.supplier')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.itemsQty')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.total')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.date')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.status')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productOrders.map(order => {
                const supplier = MOCK_ORGANIZATIONS.find(org => org.id === order.supplierId);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-swiss-teal">{order.id.substring(0,8)}...</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {supplier?.logoUrl && <img src={supplier.logoUrl} alt={supplier.name} className="w-6 h-6 rounded-full mr-2"/>}
                        {supplier?.name || order.supplierName}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {order.items.map(item => `${item.productName} (${item.quantity})`).join(', ')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">CHF {order.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(order.requestDate).toLocaleDateString(i18n.language)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOrderStatusClass(order.status)}`}>
                        {t(`orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Button variant="ghost" size="xs" onClick={() => handleSendMessageToPartner(order.supplierId, order.supplierName, UserRole.PRODUCT_SUPPLIER)}>{t('common:buttons.sendMessage')}</Button>
                      {order.status === OrderRequestStatus.SUBMITTED &&
                        <Button variant="ghost" size="xs" className="text-red-600 hover:text-red-700 ml-1" onClick={() => alert(t('foundationOrdersAppointmentsPage.cancelOrderAlert', { orderId: order.id }))}>{t('common:buttons.cancel')}</Button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const ServiceAppointmentsView = () => (
    <Card className="p-4 mt-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-swiss-charcoal">{t('foundationOrdersAppointmentsPage.serviceAppointmentsTitle')}</h3>
        <Button variant="outline" size="sm" onClick={() => alert(t('foundationOrdersAppointmentsPage.exportCsvServiceAlert'))}>{t('foundationOrdersAppointmentsPage.exportCsvButton')}</Button>
      </div>
      {serviceAppointments.length === 0 ? (
         <div className="text-center py-10 text-gray-500">
            <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            {t('foundationOrdersAppointmentsPage.noServiceAppointments')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.refNo')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.provider')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.service')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.date')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.status')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('foundationOrdersAppointmentsPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceAppointments.map(req => {
                const provider = MOCK_ORGANIZATIONS.find(org => org.id === req.providerId);
                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-swiss-teal">{req.id.substring(0,8)}...</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {provider?.logoUrl && <img src={provider.logoUrl} alt={provider.name} className="w-6 h-6 rounded-full mr-2"/>}
                        {provider?.name || t('foundationOrdersAppointmentsPage.unknownProvider')}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{req.serviceName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {req.appointmentDate ? new Date(req.appointmentDate).toLocaleDateString(i18n.language) : (req.preferredDate ? `${new Date(req.preferredDate).toLocaleDateString(i18n.language)} (${t('foundationOrdersAppointmentsPage.preferredAbbr')})` : t('foundationOrdersAppointmentsPage.notApplicable'))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getServiceStatusClass(req.status)}`}>
                        {t(`serviceStatus.${req.status.toLowerCase().replace(/\s+/g, '')}` as const, req.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Button variant="ghost" size="xs" onClick={() => handleSendMessageToPartner(req.providerId, provider?.name || t('foundationOrdersAppointmentsPage.unknownProvider'), UserRole.SERVICE_PROVIDER)}>{t('common:buttons.sendMessage')}</Button>
                       {(req.status === ServiceRequestStatus.NEW || req.status === ServiceRequestStatus.IN_REVIEW || req.status === ServiceRequestStatus.ACCEPTED) &&
                        <Button variant="ghost" size="xs" className="text-orange-600 hover:text-orange-700 ml-1" onClick={() => alert(t('foundationOrdersAppointmentsPage.rescheduleAlert', { requestId: req.id }))}>{t('foundationOrdersAppointmentsPage.rescheduleButton')}</Button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const tabs = [
    { label: t('foundationOrdersAppointmentsPage.productOrdersTab'), icon: ShoppingCartIcon, content: <ProductOrdersView /> },
    { label: t('foundationOrdersAppointmentsPage.serviceAppointmentsTab'), icon: CalendarDaysIcon, content: <ServiceAppointmentsView /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('sidebar.ordersAppointments')}</h1>
       <Tabs
         tabs={tabs}
         variant="pills"
         activeTab={activeTabIndex}
         onTabChange={setActiveTabIndex}
       />
    </div>
  );
};

export default FoundationOrdersAppointmentsPage;