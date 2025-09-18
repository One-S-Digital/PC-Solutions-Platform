import * as React from 'react';
import { Outlet } from 'react-router-dom';

type Props = { children?: React.ReactNode };

export const AdminLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="px-4 py-3 bg-white shadow">Admin</header>
      <main className="p-4">{children ?? <Outlet />}</main>
    </div>
  );
};

export default AdminLayout;
