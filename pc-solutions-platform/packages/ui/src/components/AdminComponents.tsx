import React from 'react';
import { clsx } from 'clsx';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function AdminButton({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: AdminButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'admin-button-primary',
    secondary: 'admin-button-secondary',
    outline: 'bg-transparent text-admin-text border border-admin-border hover:bg-admin-surface hover:border-admin-accent',
    ghost: 'bg-transparent text-admin-text hover:bg-admin-border',
    danger: 'bg-admin-danger text-white shadow-soft hover:opacity-95 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:shadow-inset',
    critical: 'bg-admin-critical text-white shadow-soft hover:opacity-95 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:shadow-inset'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'metric';
  children: React.ReactNode;
}

export function AdminCard({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}: AdminCardProps) {
  const baseClasses = 'admin-card';
  
  const variantClasses = {
    default: '',
    accent: 'admin-card-accent',
    metric: 'admin-metric-card'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AdminStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low';
  children: React.ReactNode;
}

export function AdminStatus({ 
  variant = 'medium', 
  className = '', 
  children, 
  ...props 
}: AdminStatusProps) {
  const baseClasses = 'flex items-center gap-2 p-3 rounded-md border';
  
  const variantClasses = {
    critical: 'admin-status-critical',
    high: 'admin-status-high',
    medium: 'admin-status-medium',
    low: 'admin-status-low'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AdminBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low';
  children: React.ReactNode;
}

export function AdminBadge({ 
  variant = 'medium', 
  className = '', 
  children, 
  ...props 
}: AdminBadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  
  const variantClasses = {
    critical: 'admin-badge-critical',
    high: 'admin-badge-high',
    medium: 'admin-badge-medium',
    low: 'admin-badge-low'
  };

  return (
    <span
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface AdminMetricProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
}

export function AdminMetric({ label, value, change, icon }: AdminMetricProps) {
  return (
    <AdminCard variant="metric" className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="admin-metric-label">{label}</p>
          <p className="admin-metric-value text-2xl font-bold">{value}</p>
          {change && (
            <p className={clsx(
              'text-sm mt-1',
              change.type === 'increase' ? 'text-admin-success' : 'text-admin-danger'
            )}>
              {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-admin-accent text-2xl">
            {icon}
          </div>
        )}
      </div>
    </AdminCard>
  );
}

interface AdminAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low';
  title?: string;
  children: React.ReactNode;
}

export function AdminAlert({ 
  variant = 'medium', 
  title, 
  className = '', 
  children, 
  ...props 
}: AdminAlertProps) {
  const baseClasses = 'p-4 rounded-md';
  
  const variantClasses = {
    critical: 'admin-alert-critical',
    high: 'admin-alert-high',
    medium: 'admin-alert-medium',
    low: 'admin-alert-low'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {title && (
        <h4 className="font-semibold text-admin-text mb-2">{title}</h4>
      )}
      <div className="text-admin-text">{children}</div>
    </div>
  );
}

interface AdminTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function AdminTable({ className = '', children, ...props }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-admin-border">
      <table className={clsx('admin-table w-full', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

interface AdminTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function AdminTableHeader({ children, ...props }: AdminTableHeaderProps) {
  return (
    <thead {...props}>
      {children}
    </thead>
  );
}

interface AdminTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function AdminTableBody({ children, ...props }: AdminTableBodyProps) {
  return (
    <tbody {...props}>
      {children}
    </tbody>
  );
}

interface AdminTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function AdminTableRow({ children, ...props }: AdminTableRowProps) {
  return (
    <tr className="border-b border-admin-border hover:bg-admin-border/50" {...props}>
      {children}
    </tr>
  );
}

interface AdminTableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function AdminTableCell({ children, ...props }: AdminTableCellProps) {
  return (
    <td className="px-4 py-3 text-admin-text" {...props}>
      {children}
    </td>
  );
}

interface AdminTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function AdminTableHeaderCell({ children, ...props }: AdminTableHeaderCellProps) {
  return (
    <th className="px-4 py-3 text-left text-sm font-medium text-admin-text bg-admin-border/50" {...props}>
      {children}
    </th>
  );
}