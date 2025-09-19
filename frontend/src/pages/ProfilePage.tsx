import React from 'react';
import { useUser } from '@clerk/clerk-react';

export default function ProfilePage() {
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
          <p className="text-gray-600">Please log in to access your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-24 h-24 rounded-full" />
              ) : (
                <span className="text-2xl text-gray-500">👤</span>
              )}
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {user.fullName || 'No name set'}
              </h2>
              <p className="text-gray-600">{user.emailAddresses[0]?.emailAddress}</p>
              <p className="text-sm text-gray-500">
                Role: {user.publicMetadata?.role || 'No role assigned'}
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <p className="mt-1 text-gray-900">{user.firstName || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <p className="mt-1 text-gray-900">{user.lastName || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{user.emailAddresses[0]?.emailAddress}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{user.phoneNumbers[0]?.phoneNumber || 'Not set'}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}