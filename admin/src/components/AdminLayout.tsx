import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { markVisited } from '../utils/notificationState'

type Props = { children?: React.ReactNode };

export const AdminLayout: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/users')) {
      markVisited('users')
      return
    }
    if (path.startsWith('/products')) {
      markVisited('products')
      return
    }
    if (path.startsWith('/services')) {
      markVisited('services')
      return
    }
    if (path.startsWith('/support')) {
      markVisited('support')
      return
    }
    if (path.startsWith('/subscriptions')) {
      markVisited('subscriptions')
      return
    }
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh overflow-x-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="min-w-0 flex-1 flex flex-col lg:pl-72">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="min-w-0 flex-1 bg-page-bg p-4 overflow-x-hidden">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
