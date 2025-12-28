import type { User } from '../types';

export const getHomePath = (user?: User | null): string => {
  return user ? '/dashboard' : '/login';
};
