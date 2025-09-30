import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SquaresPlusIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { usePricingPlans } from '../hooks/usePricingPlans'
import { pricingAdapter } from '../adapters/pricing.adapter'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const PricingPage: React.FC = () => {
  const { data: plans, isLoading, error } = usePricingPlans()

  // Set SEO meta tags
  useEffect(() => {
    document.title = 'Pricing Plans - Pro Crèche Solutions'
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Choose the perfect plan for your daycare, supplier, or service provider business. Transparent pricing with no hidden fees.')
    }

    // Add Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta')
    ogTitle.setAttribute('property', 'og:title')
    ogTitle.setAttribute('content', 'Pricing Plans - Pro Crèche Solutions')
    if (!document.querySelector('meta[property="og:title"]')) {
      document.head.appendChild(ogTitle)
    }

    const ogDescription = document.querySelector('meta[property="og:description"]') || document.createElement('meta')
    ogDescription.setAttribute('property', 'og:description')
    ogDescription.setAttribute('content', 'Choose the perfect plan for your daycare, supplier, or service provider business. Transparent pricing with no hidden fees.')
    if (!document.querySelector('meta[property="og:description"]')) {
      document.head.appendChild(ogDescription)
    }

    const ogUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta')
    ogUrl.setAttribute('property', 'og:url')
    ogUrl.setAttribute('content', window.location.href)
    if (!document.querySelector('meta[property="og:url"]')) {
      document.head.appendChild(ogUrl)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="bg-page-bg min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-page-bg min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Plans</h1>
          <p className="text-gray-600">Failed to load pricing plans. Please try again later.</p>
        </div>
      </div>
    )
  }

  if (!plans) {
    return (
      <div className="bg-page-bg min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">No Plans Available</h1>
          <p className="text-gray-600">Pricing plans are not currently available.</p>
        </div>
      </div>
    )
  }

  // Transform plans using adapter
  const uiPlans = plans.map(plan => pricingAdapter.toUI(plan))
  
  // Group plans by role
  const foundationPlans = uiPlans.filter(plan => plan.role === 'FOUNDATION')
  const supplierPlans = uiPlans.filter(plan => plan.role === 'PRODUCT_SUPPLIER')
  const serviceProviderPlans = uiPlans.filter(plan => plan.role === 'SERVICE_PROVIDER')

  const PlanCard: React.FC<{ plan: typeof uiPlans[0] }> = ({ plan }) => (
    <div className={`flex flex-col p-6 border-2 ${plan.isPopular ? 'border-swiss-mint' : 'border-gray-200'} rounded-lg relative bg-white`}>
      {plan.isPopular && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase bg-swiss-mint rounded-full">
            Popular
          </span>
        </div>
      )}
      <h3 className="text-2xl font-bold text-swiss-charcoal text-center mt-3">
        {plan.emoji} {plan.name}
      </h3>
      
      <div className="my-4 text-center space-y-1">
        <p className="text-xl font-semibold text-gray-800">{plan.monthlyPriceText}</p>
        <p className="text-sm text-gray-600">{plan.annualPlanText}</p>
      </div>

      <p className="text-sm text-gray-600 text-center font-medium my-2">{plan.tagline}</p>
      <p className="text-sm text-gray-600 text-center my-4">{plan.description}</p>

      <p className="font-semibold text-swiss-charcoal mb-3">What you get:</p>
      <ul className="space-y-3 text-sm text-gray-600 flex-grow">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-start">
            <CheckCircleIcon className="w-5 h-5 text-swiss-mint mr-2 flex-shrink-0 mt-0.5" />
            <span className={`${feature.toLowerCase().includes('everything in') ? 'font-bold text-gray-800' : ''}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <button className={`btn ${plan.isPopular ? 'btn-primary' : 'btn-outline'} w-full mt-6`}>
        Choose Plan
      </button>
    </div>
  )

  return (
    <div className="bg-page-bg min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative text-swiss-charcoal">
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 lg:p-8 flex justify-between items-center z-10">
        <Link to="/login" className="flex items-center space-x-2 text-swiss-charcoal hover:text-swiss-teal transition-colors">
          <SquaresPlusIcon className="h-8 w-8 text-swiss-mint" />
          <span className="font-bold text-lg hidden sm:block">Pro Crèche Solutions</span>
        </Link>
        <Link to="/login" className="btn btn-light">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Login
        </Link>
      </div>

      <div className="max-w-7xl mx-auto pt-16 sm:pt-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-swiss-charcoal">
            ProCrèche Solutions – Pricing Guide
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Choose the plan that's right for your daycare
          </p>
        </div>
        
        {/* Foundation Plans */}
        {foundationPlans.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-center text-swiss-charcoal mb-8">
              ProCrèche Solutions – Pricing for Daycares
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {foundationPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          </div>
        )}

        {/* Supplier and Service Provider Plans */}
        {(supplierPlans.length > 0 || serviceProviderPlans.length > 0) && (
          <div className="mt-16">
            <h2 className="text-3xl font-semibold text-center text-swiss-charcoal mb-8">
              ProCrèche Solutions – Pricing for Suppliers & Service Providers
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {supplierPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
              {serviceProviderPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PricingPage