import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { RoleBasedSidebar } from './RoleBasedSidebar';
import { QuickMessage } from './QuickMessage';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(1);

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search functionality
  };

  const handleNotificationClick = () => {
    console.log('Notification clicked');
    // Implement notification handling
  };

  const handleLanguageChange = (language: string) => {
    console.log('Language changed to:', language);
    // Implement language change
  };

  const handleSendMessage = async (message: string) => {
    console.log('Sending message:', message);
    // Implement message sending
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <RoleBasedSidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <TopBar
          onSearch={handleSearch}
          onNotificationClick={handleNotificationClick}
          onLanguageChange={handleLanguageChange}
          currentLanguage="EN"
          notificationCount={notificationCount}
        />

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}