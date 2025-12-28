import React from 'react';
import { Link } from 'react-router-dom';

interface LogoLinkProps {
  to: string;
  ariaLabel: string;
  logoUrl?: string | null;
  altText: string;
  showFallback: boolean;
  imageClassName?: string;
  iconClassName?: string;
  fallbackIcon?: React.ElementType;
  fallback?: React.ReactNode;
  placeholderClassName?: string;
  className?: string;
}

const LogoLink: React.FC<LogoLinkProps> = ({
  to,
  ariaLabel,
  logoUrl,
  altText,
  showFallback,
  imageClassName,
  iconClassName,
  fallbackIcon: FallbackIcon,
  fallback,
  placeholderClassName,
  className,
}) => {
  if (logoUrl) {
    return (
      <Link to={to} aria-label={ariaLabel} className={className}>
        <img src={logoUrl} alt={altText} className={imageClassName} />
      </Link>
    );
  }

  if (showFallback) {
    return (
      <Link to={to} aria-label={ariaLabel} className={className}>
        {fallback ?? (FallbackIcon ? <FallbackIcon className={iconClassName} /> : null)}
      </Link>
    );
  }

  return <span className={placeholderClassName ?? imageClassName} aria-hidden="true" />;
};

export default LogoLink;
