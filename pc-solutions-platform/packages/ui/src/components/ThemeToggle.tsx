import React, { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'fixed' | 'relative' | 'absolute';
}

export function ThemeToggle({ 
  className = '', 
  size = 'md', 
  position = 'fixed' 
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl'
  };

  const positionClasses = {
    fixed: 'fixed bottom-4 right-4 z-50',
    relative: 'relative',
    absolute: 'absolute'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        ${positionClasses[position]}
        flex items-center justify-center
        rounded-full
        bg-surface-1
        border border-border
        shadow-float
        hover:shadow-pop
        transition-all duration-150 ease-standard
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="relative">
        <span 
          className={`
            absolute inset-0 flex items-center justify-center
            transition-opacity duration-200 ease-standard
            ${isDark ? 'opacity-0' : 'opacity-100'}
          `}
        >
          ☀️
        </span>
        <span 
          className={`
            absolute inset-0 flex items-center justify-center
            transition-opacity duration-200 ease-standard
            ${isDark ? 'opacity-100' : 'opacity-0'}
          `}
        >
          🌙
        </span>
      </span>
    </button>
  );
}

export default ThemeToggle;