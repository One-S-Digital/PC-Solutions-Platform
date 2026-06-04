const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const getAvatarFallback = (name: string, background = '48CFAE', color = 'fff'): string => {
  const initials = getInitials(name) || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#${background}"/><text x="64" y="64" font-family="Arial,sans-serif" font-size="48" font-weight="600" fill="#${color}" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
