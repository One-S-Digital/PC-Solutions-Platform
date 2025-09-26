
import React, { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode; // Made children optional
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-button focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-minimal hover:shadow-interactive";

  const variantStyles = {
    primary: 'bg-swiss-mint text-white hover:bg-opacity-90 focus:ring-swiss-mint',
    secondary: 'bg-swiss-teal text-white hover:bg-opacity-90 focus:ring-swiss-teal',
    danger: 'bg-swiss-coral text-white hover:bg-opacity-90 focus:ring-swiss-coral',
    outline: 'border border-swiss-mint text-swiss-mint hover:bg-swiss-mint/10 focus:ring-swiss-mint',
    ghost: 'text-swiss-teal hover:bg-swiss-teal/10 focus:ring-swiss-teal shadow-none hover:shadow-none',
    light: 'bg-gray-100 text-swiss-charcoal hover:bg-gray-200 focus:ring-gray-300 border border-gray-200',
  };

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {LeftIcon && <LeftIcon className={`h-4 w-4 ${children ? (size === 'xs' ? 'mr-1' : 'mr-2') : ''}`} />}
      {children}
      {RightIcon && <RightIcon className={`h-4 w-4 ${children ? (size === 'xs' ? 'ml-1' : 'ml-2') : ''}`} />}
    </button>
  );
};

export default Button;
