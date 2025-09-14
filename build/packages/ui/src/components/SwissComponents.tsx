import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-accent text-accent-contrast shadow-soft hover:opacity-95 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:shadow-inset',
    secondary: 'bg-surface-1 text-text-strong border border-border shadow-soft hover:bg-surface-2',
    outline: 'bg-transparent text-text-strong border border-border hover:bg-surface-1 hover:border-border-strong',
    ghost: 'bg-transparent text-text-strong hover:bg-surface-2',
    danger: 'bg-danger text-white shadow-soft hover:opacity-95 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:shadow-inset'
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

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'notch';
  children: React.ReactNode;
}

export function Card({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}: CardProps) {
  const baseClasses = 'bg-surface-1 border border-border rounded-md shadow-soft';
  
  const variantClasses = {
    default: '',
    accent: 'card-accent',
    notch: 'notch-tr'
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

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
}

export function Input({ 
  label, 
  error, 
  help, 
  className = '', 
  ...props 
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-150 ease-standard',
          error && 'border-danger focus-visible:ring-danger',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-text-subtle">{help}</p>
      )}
    </div>
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function Badge({ 
  variant = 'info', 
  className = '', 
  children, 
  ...props 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  
  const variantClasses = {
    success: 'bg-[color-mix(in_oklab,var(--success)_15%,white_85%)] text-text-strong',
    warning: 'bg-[color-mix(in_oklab,var(--warn)_15%,white_85%)] text-text-strong',
    error: 'bg-[color-mix(in_oklab,var(--danger)_15%,white_85%)] text-text-strong',
    info: 'bg-[color-mix(in_oklab,var(--accent)_15%,white_85%)] text-text-strong'
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

interface StatusProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function Status({ 
  variant = 'info', 
  className = '', 
  children, 
  ...props 
}: StatusProps) {
  const baseClasses = 'flex items-center gap-2 p-3 rounded-md border';
  
  const variantClasses = {
    success: 'bg-[color-mix(in_oklab,var(--success)_15%,white_85%)] border-[color-mix(in_oklab,var(--success)_30%,white_70%)] text-text-strong',
    warning: 'bg-[color-mix(in_oklab,var(--warn)_15%,white_85%)] border-[color-mix(in_oklab,var(--warn)_30%,white_70%)] text-text-strong',
    error: 'bg-[color-mix(in_oklab,var(--danger)_15%,white_85%)] border-[color-mix(in_oklab,var(--danger)_30%,white_70%)] text-text-strong',
    info: 'bg-[color-mix(in_oklab,var(--accent)_15%,white_85%)] border-[color-mix(in_oklab,var(--accent)_30%,white_70%)] text-text-strong'
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