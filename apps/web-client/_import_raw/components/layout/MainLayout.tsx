

import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-swiss-light-gray text-swiss-charcoal">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 flex z-40" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            aria-hidden="true"
            onClick={closeMobileSidebar}
          ></div>

          {/* Sidebar Panel */}
          <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="absolute top-0 right-0 -mr-12 pt-2 opacity-100"> {/* Ensure button is visible */}
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white hover:bg-gray-700"
                onClick={closeMobileSidebar}
                aria-label="Close sidebar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {/* Pass onLinkClick to close sidebar on navigation */}
            <Sidebar onLinkClick={closeMobileSidebar} isMobileView={true} /> 
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMobileMenuToggle={toggleMobileSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-page-bg p-8"> {/* Increased padding */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;