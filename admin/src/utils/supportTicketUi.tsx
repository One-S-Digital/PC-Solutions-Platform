import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { TicketPriority, TicketStatus } from '../types';

export function getTicketStatusColor(status: TicketStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getTicketPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case 'LOW':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'URGENT':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getTicketStatusIcon(status: TicketStatus): React.ReactNode {
  switch (status) {
    case 'OPEN':
      return <AlertCircle className="h-4 w-4" />;
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4" />;
    case 'RESOLVED':
      return <CheckCircle className="h-4 w-4" />;
    case 'CLOSED':
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

