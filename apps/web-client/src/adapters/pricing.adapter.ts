// Pricing plan data adapter for transforming API responses to UI models
export interface ApiPricingPlan {
  id: string
  name: string
  emoji: string
  role: string
  price: {
    monthly: number
    annually: number
  }
  monthlyPriceText: string
  annualPlanText: string
  tagline: string
  description: string
  features: string[]
  isPopular: boolean
}

export interface UIPricingPlan {
  id: string
  name: string
  emoji: string
  role: string
  price: {
    monthly: number
    annually: number
  }
  monthlyPriceText: string
  annualPlanText: string
  tagline: string
  description: string
  features: string[]
  isPopular: boolean
  formattedMonthlyPrice: string
  formattedAnnualPrice: string
  savingsAmount: number
  savingsPercentage: number
  roleLabel: string
}

export const pricingAdapter = {
  toUI: (apiPlan: ApiPricingPlan): UIPricingPlan => {
    const savingsAmount = (apiPlan.price.monthly * 12) - apiPlan.price.annually
    const savingsPercentage = Math.round((savingsAmount / (apiPlan.price.monthly * 12)) * 100)
    
    return {
      ...apiPlan,
      formattedMonthlyPrice: `CHF ${apiPlan.price.monthly}`,
      formattedAnnualPrice: `CHF ${apiPlan.price.annually}`,
      savingsAmount,
      savingsPercentage,
      roleLabel: apiPlan.role === 'FOUNDATION' ? 'Daycare Plans' : 
                 apiPlan.role === 'PRODUCT_SUPPLIER' ? 'Supplier Plans' : 
                 apiPlan.role === 'SERVICE_PROVIDER' ? 'Service Provider Plans' : 
                 'Other Plans',
    }
  },
  
  toAPI: (uiPlan: Partial<UIPricingPlan>): Partial<ApiPricingPlan> => ({
    id: uiPlan.id,
    name: uiPlan.name,
    emoji: uiPlan.emoji,
    role: uiPlan.role,
    price: uiPlan.price,
    monthlyPriceText: uiPlan.monthlyPriceText,
    annualPlanText: uiPlan.annualPlanText,
    tagline: uiPlan.tagline,
    description: uiPlan.description,
    features: uiPlan.features,
    isPopular: uiPlan.isPopular,
  }),
}