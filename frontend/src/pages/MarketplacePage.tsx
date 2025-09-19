import React from 'react';
import { useUser } from '@clerk/clerk-react';

export default function MarketplacePage() {
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
          <p className="text-gray-600">Please log in to access the marketplace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Marketplace</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Products</h3>
            <p className="text-gray-600 mb-4">Browse and purchase educational products</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              View Products
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <p className="text-gray-600 mb-4">Find professional services</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              View Services
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Job Listings</h3>
            <p className="text-gray-600 mb-4">Find employment opportunities</p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              View Jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}