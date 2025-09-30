import { useQuery } from '@tanstack/react-query'
import { ApiPricingPlan } from '../adapters/pricing.adapter'
import plansData from '../data/plans.json'

// Hook for fetching pricing plans
export const usePricingPlans = () => {
  return useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async (): Promise<ApiPricingPlan[]> => {
      // TODO: Replace with actual API call when available
      // const response = await apiClient.get('/api/plans')
      // return response.data
      
      // For now, return static data
      return plansData as ApiPricingPlan[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour - plans don't change often
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

// Hook for fetching plans by role
export const usePricingPlansByRole = (role?: string) => {
  const { data: allPlans, ...rest } = usePricingPlans()
  
  const plans = role ? allPlans?.filter(plan => plan.role === role) : allPlans
  
  return {
    plans,
    ...rest
  }
}