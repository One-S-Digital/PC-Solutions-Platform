import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

type Props = { children?: React.ReactNode };

export const AdminLayout: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col lg:pl-72">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 bg-page-bg p-4">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
