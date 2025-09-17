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
      <div className="min-h-screen frontend-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Swiss Modern Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            {/* Swiss accent stripe */}
            <div className="mx-auto h-1 w-16 bg-swiss-mint rounded-full mb-6"></div>
            
            {/* Logo placeholder */}
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-swiss-light border border-swiss-mint/20 mb-6">
              <span className="text-2xl font-bold text-swiss-mint">PC</span>
            </div>
            
            <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
              Join PC Solutions Platform
            </h1>
            <p className="mt-3 text-swiss-gray font-medium">
              Choose your role to get started
            </p>
          </div>
        </div>

        {/* Swiss Modern Role Selection */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className="card-swiss p-6 text-left hover:shadow-interactive hover:scale-[1.02] transition-all duration-200 group"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-swiss-mint rounded-full mr-3 group-hover:bg-swiss-teal transition-colors"></div>
                    <h3 className="text-lg font-semibold text-swiss-charcoal">
                      {role.label}
                    </h3>
                  </div>
                  <p className="text-swiss-gray flex-grow">
                    {role.description}
                  </p>
                  <div className="mt-4 flex items-center text-swiss-teal font-medium text-sm group-hover:text-swiss-mint transition-colors">
                    Get Started
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe */}
          <div className="mx-auto h-1 w-16 bg-swiss-mint rounded-full mb-6"></div>
          
          {/* Logo placeholder */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-swiss-light border border-swiss-mint/20 mb-6">
            <span className="text-2xl font-bold text-swiss-mint">PC</span>
          </div>
          
          <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
            Create your account
          </h1>
          <p className="mt-3 text-swiss-gray font-medium">
            Role: {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
          </p>
        </div>
      </div>

      {/* Swiss Modern Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-swiss py-8 px-6 sm:px-10 relative">
          {/* Swiss corner notch */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-swiss-mint rounded-bl-md"></div>
          
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 'bg-swiss-mint hover:bg-swiss-mint-dark text-white font-semibold py-3 px-6 rounded-button transition-all duration-200 shadow-minimal hover:shadow-interactive',
                card: 'shadow-none bg-transparent',
                formFieldInput: 'rounded-input border border-gray-300 bg-white px-3 py-2 text-swiss-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint transition-all duration-150',
                formFieldLabel: 'text-sm font-semibold text-swiss-charcoal mb-2',
                identityPreviewText: 'text-swiss-gray',
                identityPreviewEditButton: 'text-swiss-teal hover:text-swiss-mint font-medium',
                footerActionLink: 'text-swiss-teal hover:text-swiss-mint font-semibold',
                footerActionText: 'text-swiss-gray',
                socialButtonsBlockButton: 'border border-gray-300 bg-white text-swiss-charcoal hover:bg-gray-50 rounded-input transition-all duration-200',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-swiss-gray',
                formHeaderTitle: 'text-xl font-bold text-swiss-charcoal',
                formHeaderSubtitle: 'text-swiss-gray',
                formResendCodeLink: 'text-swiss-teal hover:text-swiss-mint font-medium',
                otpCodeFieldInput: 'rounded-input border border-gray-300 bg-white px-3 py-2 text-swiss-charcoal focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint',
                formFieldSuccessText: 'text-green-600',
                formFieldErrorText: 'text-red-600',
                alertText: 'text-red-600',
                formFieldWarningText: 'text-yellow-600',
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