import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-button focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-minimal hover:shadow-interactive';
  
  const variantClasses = {
    primary: 'bg-swiss-mint text-white hover:bg-swiss-mint-dark focus:ring-swiss-mint',
    secondary: 'bg-swiss-teal text-white hover:bg-swiss-teal-dark focus:ring-swiss-teal',
    outline: 'border border-swiss-mint text-swiss-mint hover:bg-swiss-mint/10 focus:ring-swiss-mint',
    ghost: 'text-swiss-teal hover:bg-swiss-teal/10 focus:ring-swiss-teal shadow-none hover:shadow-none',
    danger: 'bg-swiss-coral text-white hover:bg-swiss-coral-dark focus:ring-swiss-coral',
    light: 'bg-gray-100 text-swiss-charcoal hover:bg-gray-200 focus:ring-gray-300 border border-gray-200'
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

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'notch';
  children: React.ReactNode;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export function Card({ 
  variant = 'default', 
  className = '', 
  children, 
  hoverEffect = false,
  onClick,
  ...props 
}: CardProps) {
  const baseClasses = 'bg-white rounded-card shadow-soft';
  const hoverClasses = hoverEffect ? 'hover:shadow-xl hover:scale-[1.015] transition-all duration-300 ease-in-out' : '';
  
  const variantClasses = {
    default: '',
    accent: 'border-l-4 border-swiss-mint',
    notch: 'relative before:absolute before:top-0 before:right-0 before:w-2 before:h-2 before:bg-swiss-mint before:rounded-bl-md'
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

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

export function Input({ 
  label, 
  error, 
  help, 
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '', 
  ...props 
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-swiss-charcoal">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LeftIcon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <input
          className={clsx(
            'w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-swiss-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint transition-all duration-150 ease-in-out',
            LeftIcon && 'pl-10',
            RightIcon && 'pr-10',
            error && 'border-swiss-coral focus:ring-swiss-coral focus:border-swiss-coral',
            className
          )}
          {...props}
        />
        {RightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <RightIcon className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-swiss-coral">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
}

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  help,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-swiss-charcoal">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-swiss-charcoal focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint transition-all duration-150 ease-in-out',
          error && 'border-swiss-coral focus:ring-swiss-coral focus:border-swiss-coral',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-swiss-coral">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
}

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
}

export function Textarea({
  label,
  error,
  help,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-swiss-charcoal">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-swiss-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint transition-all duration-150 ease-in-out',
          error && 'border-swiss-coral focus:ring-swiss-coral focus:border-swiss-coral',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-swiss-coral">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'mint' | 'teal' | 'coral' | 'sand';
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
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    mint: 'bg-swiss-mint-light text-swiss-mint-dark',
    teal: 'bg-swiss-teal-light text-swiss-teal-dark',
    coral: 'bg-swiss-coral-light text-swiss-coral-dark',
    sand: 'bg-swiss-sand-light text-swiss-sand-dark'
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
  variant?: 'success' | 'warning' | 'error' | 'info' | 'mint' | 'teal' | 'coral' | 'sand';
  children: React.ReactNode;
}

export function Status({ 
  variant = 'info', 
  className = '', 
  children, 
  ...props 
}: StatusProps) {
  const baseClasses = 'flex items-center gap-2 p-3 rounded-card border';
  
  const variantClasses = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    mint: 'bg-swiss-mint-light border-swiss-mint text-swiss-mint-dark',
    teal: 'bg-swiss-teal-light border-swiss-teal text-swiss-teal-dark',
    coral: 'bg-swiss-coral-light border-swiss-coral text-swiss-coral-dark',
    sand: 'bg-swiss-sand-light border-swiss-sand text-swiss-sand-dark'
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