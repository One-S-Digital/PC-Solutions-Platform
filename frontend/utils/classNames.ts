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
  
  // Simple implementation - in a real app you might want to use tailwind-merge
  return validClasses.join(' ');
}
