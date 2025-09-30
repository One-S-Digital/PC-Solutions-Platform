import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline'

const Sidebar: React.FC = () => {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingBagIcon },
    { name: 'Recruitment', href: '/recruitment', icon: UserGroupIcon },
    { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ]

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-swiss-mint text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default Sidebar