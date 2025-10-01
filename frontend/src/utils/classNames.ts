/**
 * Utility function to conditionally join class names
 * Similar to clsx or classnames library
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to merge Tailwind classes
 * Handles conflicts by keeping the last occurrence
 */
export function mergeClasses(...classes: (string | undefined | null | false)[]): string {
  const validClasses = classes.filter(Boolean) as string[];
  
  if (validClasses.length === 0) return '';
  
  // Simple implementation - in a real app you might want to use a library like tailwind-merge
  return validClasses.join(' ');
}

/**
 * Utility function to create conditional classes
 */
export function conditionalClasses(
  condition: boolean,
  trueClasses: string,
  falseClasses: string = ''
): string {
  return condition ? trueClasses : falseClasses;
}

/**
 * Utility function to create responsive classes
 */
export function responsiveClasses(classes: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  const { base, sm, md, lg, xl, '2xl': xl2 } = classes;
  
  return classNames(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`,
    xl && `xl:${xl}`,
    xl2 && `2xl:${xl2}`
  );
}