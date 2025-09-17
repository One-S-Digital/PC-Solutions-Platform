import React from 'react';
import { clsx } from 'clsx';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'critical';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

export function AdminButton({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props 
}: AdminButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-button focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-minimal hover:shadow-interactive';
  
  const variantClasses = {
    primary: 'bg-admin-mint text-white hover:bg-admin-mint-dark focus:ring-admin-mint',
    secondary: 'bg-admin-teal text-white hover:bg-admin-teal-dark focus:ring-admin-teal',
    outline: 'border border-admin-mint text-admin-mint hover:bg-admin-mint/10 focus:ring-admin-mint',
    ghost: 'text-admin-teal hover:bg-admin-teal/10 focus:ring-admin-teal shadow-none hover:shadow-none',
    danger: 'bg-admin-coral text-white hover:bg-admin-coral-dark focus:ring-admin-coral',
    critical: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
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
      {LeftIcon && <LeftIcon className={`h-4 w-4 ${children ? (size === 'xs' ? 'mr-1' : 'mr-2') : ''}`} />}
      {children}
      {RightIcon && <RightIcon className={`h-4 w-4 ${children ? (size === 'xs' ? 'ml-1' : 'ml-2') : ''}`} />}
    </button>
  );
}

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'metric';
  children: React.ReactNode;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export function AdminCard({ 
  variant = 'default', 
  className = '', 
  children, 
  hoverEffect = false,
  onClick,
  ...props 
}: AdminCardProps) {
  const baseClasses = 'bg-white rounded-card shadow-soft';
  const hoverClasses = hoverEffect ? 'hover:shadow-xl hover:scale-[1.015] transition-all duration-300 ease-in-out' : '';
  
  const variantClasses = {
    default: '',
    accent: 'border-l-4 border-admin-mint',
    metric: 'p-6'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        hoverClasses,
        variantClasses[variant],
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

interface AdminStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'mint' | 'teal' | 'coral' | 'sand';
  children: React.ReactNode;
}

export function AdminStatus({ 
  variant = 'medium', 
  className = '', 
  children, 
  ...props 
}: AdminStatusProps) {
  const baseClasses = 'flex items-center gap-2 p-3 rounded-card border';
  
  const variantClasses = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    low: 'bg-green-50 border-green-200 text-green-700',
    mint: 'bg-admin-mint-light border-admin-mint text-admin-mint-dark',
    teal: 'bg-admin-teal-light border-admin-teal text-admin-teal-dark',
    coral: 'bg-admin-coral-light border-admin-coral text-admin-coral-dark',
    sand: 'bg-admin-sand-light border-admin-sand text-admin-sand-dark'
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
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'mint' | 'teal' | 'coral' | 'sand';
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
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    mint: 'bg-admin-mint-light text-admin-mint-dark',
    teal: 'bg-admin-teal-light text-admin-teal-dark',
    coral: 'bg-admin-coral-light text-admin-coral-dark',
    sand: 'bg-admin-sand-light text-admin-sand-dark'
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
          <p className="text-sm text-admin-gray mb-1">{label}</p>
          <p className="text-2xl font-bold text-admin-charcoal">{value}</p>
          {change && (
            <p className={clsx(
              'text-sm mt-1',
              change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            )}>
              {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-admin-mint text-2xl">
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
  const baseClasses = 'p-4 rounded-card border';
  
  const variantClasses = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    low: 'bg-green-50 border-green-200 text-green-700'
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
        <h4 className="font-semibold text-admin-charcoal mb-2">{title}</h4>
      )}
      <div className="text-admin-gray">{children}</div>
    </div>
  );
}

interface AdminTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function AdminTable({ className = '', children, ...props }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-card border border-gray-200">
      <table className={clsx('w-full', className)} {...props}>
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
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors" {...props}>
      {children}
    </tr>
  );
}

interface AdminTableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function AdminTableCell({ children, ...props }: AdminTableCellProps) {
  return (
    <td className="px-4 py-3 text-admin-charcoal" {...props}>
      {children}
    </td>
  );
}

interface AdminTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function AdminTableHeaderCell({ children, ...props }: AdminTableHeaderCellProps) {
  return (
    <th className="px-4 py-3 text-left text-sm font-medium text-admin-charcoal bg-gray-50" {...props}>
      {children}
    </th>
  );
}