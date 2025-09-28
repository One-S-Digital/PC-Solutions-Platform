import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon,
  UsersIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { label: 'Overview', to: '/dashboard', icon: Squares2X2Icon },
  { label: 'Marketplace', to: '/marketplace', icon: ShoppingCartIcon },
  { label: 'Recruitment', to: '/recruitment', icon: UsersIcon },
  { label: 'Profile', to: '/profile', icon: UserCircleIcon },
  { label: 'Settings', to: '/settings', icon: Cog6ToothIcon },
];

const DashboardSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="py-6">
        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-swiss-teal bg-swiss-mint/10 border-l-4 border-swiss-teal'
                    : 'text-gray-600 hover:text-swiss-teal hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
