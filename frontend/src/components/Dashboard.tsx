import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { UserButton } from '@clerk/clerk-react';

export function Dashboard() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                PC Solutions Platform
              </h1>
            </div>
            <div className="flex items-center">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome, {user?.firstName}!
              </h2>
              <p className="text-gray-600 mb-8">
                You are successfully logged in to the PC Solutions platform.
              </p>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Role</h3>
                  <p className="text-gray-600">
                    {(user?.publicMetadata?.role as string) || 'No role assigned'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Email</h3>
                  <p className="text-gray-600">{user?.emailAddresses[0]?.emailAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}