
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ParentLead, UserRole, FoundationLeadResponseStatus, LeadMainStatus } from '../types';
import Card from '../components/ui/Card';
import LeadCard from '../components/foundation/LeadCard'; // Correct relative path
import { InboxArrowDownIcon, InboxIcon } from '@heroicons/react/24/outline';

const FoundationLeadsPage: React.FC = () => {
  const { currentUser, leads, setLeads } = useAppContext();

  if (!currentUser || currentUser.role !== UserRole.FOUNDATION || !currentUser.orgId) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-swiss-charcoal">Access Denied</h1>
        <p className="text-gray-600">You must be logged in as a Foundation with a valid Organization ID to view this page.</p>
      </div>
    );
  }

  const myOrgId = currentUser.orgId;
  const foundationLeads = leads.filter(lead => 
    lead.responses.some(r => r.foundationId === myOrgId) || 
    (lead.mainStatus === LeadMainStatus.NEW && (lead.assignedFoundations.includes(myOrgId) || lead.assignedFoundations.length === 0))
  );

  const handleLeadUpdate = (updatedLead: ParentLead) => {
    setLeads(prevLeads => prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l));
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <InboxArrowDownIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          Incoming Parent Leads
        </h1>
        {/* Add filters here: by status, date, etc. */}
      </div>

      {foundationLeads.length === 0 && (
         <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">No Incoming Leads</h2>
          <p className="text-gray-500">There are currently no new parent enquiries matching your daycare.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foundationLeads.map((lead) => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            foundationOrgId={myOrgId} 
            onUpdateLead={handleLeadUpdate} 
          />
        ))}
      </div>
    </div>
  );
};

export default FoundationLeadsPage;
