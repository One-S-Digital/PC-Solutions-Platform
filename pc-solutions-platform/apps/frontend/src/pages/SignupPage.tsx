import React, { useState } from 'react';
import { SignUp } from '@clerk/clerk-react';

// Define types locally for now
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

const ROLE_OPTIONS = [
  {
    value: 'foundation',
    label: 'Foundation (Daycare)',
    description: 'Manage your daycare operations, recruit staff, and procure services',
  },
  {
    value: 'product_supplier',
    label: 'Product Supplier',
    description: 'Sell products to childcare organizations',
  },
  {
    value: 'service_provider',
    label: 'Service Provider',
    description: 'Offer services to childcare organizations',
  },
  {
    value: 'educator',
    label: 'Educator/Candidate',
    description: 'Find employment opportunities in childcare',
  },
  {
    value: 'parent',
    label: 'Parent',
    description: 'Find childcare services for your children',
  },
];

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<string>('');

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join PC Solutions Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose your role to get started
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 text-left shadow-sm hover:border-primary-500 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium text-gray-900">
                    {role.label}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {role.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Role: {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
                card: 'shadow-none',
              },
            }}
            afterSignUpUrl="/dashboard"
            signInUrl="/login"
          />
        </div>
      </div>
    </div>
  );
}