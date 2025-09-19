import React from 'react';
import { useUser } from '@clerk/clerk-react';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as string;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.fullName || user.emailAddresses[0]?.emailAddress}!</h2>
          <p className="text-gray-600 mb-4">Role: {userRole || 'No role assigned'}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">Quick Actions</h3>
              <p className="text-blue-700 text-sm">Access your most used features</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">Recent Activity</h3>
              <p className="text-green-700 text-sm">View your latest updates</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900">Notifications</h3>
              <p className="text-purple-700 text-sm">Stay updated with alerts</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Navigation Test</h3>
            <div className="flex gap-4">
              <a href="/profile" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Profile
              </a>
              <a href="/settings" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                Settings
              </a>
              <a href="/marketplace" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Marketplace
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}