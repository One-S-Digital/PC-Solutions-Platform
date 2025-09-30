import React from 'react'
import { Link } from 'react-router-dom'
import { SquaresPlusIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

const PricingPage: React.FC = () => {
  const plans = [
    {
      name: 'Basic',
      emoji: '🟢',
      price: { monthly: 69, annually: 745 },
      monthlyPriceText: '💰 CHF 69 / month',
      annualPlanText: 'CHF 745 / year (save 10%)',
      tagline: 'Perfect for: Small daycares who want essential tools without complexity.',
      description: '✨ Get immediate access to suppliers, compliance info, and support—everything you need to operate smoothly at a low cost.',
      features: [
        'Supplier & service provider marketplace',
        'State policy hub (by canton)',
        'Multilingual interface (EN/FR/DE)',
        'Email support',
      ],
      isPopular: false,
    },
    {
      name: 'Essential',
      emoji: '🔵',
      price: { monthly: 129, annually: 1390 },
      monthlyPriceText: '💰 CHF 129 / month',
      annualPlanText: 'CHF 1,390 / year (save 10%)',
      tagline: 'Perfect for: Single-site daycares who want to save time with parent leads and compliant HR tools.',
      description: '✨ Win parents faster, stay compliant, and manage enquiries with ease—all from one simple dashboard.',
      features: [
        'Everything in Basic',
        'Parent leads inbox + auto-matching system',
        'HR & compliance document library (Swiss-validated)',
        'Parent enquiry tracker with quick replies',
      ],
      isPopular: true,
    },
    {
      name: 'Professional',
      emoji: '🔴',
      price: { monthly: 259, annually: 2790 },
      monthlyPriceText: '💰 CHF 259 / month',
      annualPlanText: 'CHF 2,790 / year (save 10%)',
      tagline: 'Perfect for: Medium-sized daycares ready to grow and professionalize operations.',
      description: '✨ Recruit and train staff, handle unlimited parent enquiries, and deliver excellence without adding admin burden.',
      features: [
        'Everything in Essential',
        'Recruitment module',
        'Unlimited parent enquiries',
        'E-learning for staff',
        'Phone support',
      ],
      isPopular: false,
    },
  ]

  const PlanCard: React.FC<{ plan: typeof plans[0] }> = ({ plan }) => (
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
        
        <div className="mt-12">
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map(plan => <PlanCard key={plan.name} plan={plan} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage