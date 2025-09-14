import { useState, useEffect } from 'react';

export interface FeatureAccess {
  userPlan: 'Basic' | 'Professional' | 'Enterprise';
  locked: string[];
  unlocked: string[];
}

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  requiredPlan: 'Professional' | 'Enterprise';
  benefit: string;
}

export function useFeatureAccess() {
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    userPlan: 'Basic',
    locked: [],
    unlocked: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user's subscription status and feature access
    fetchFeatureAccess();
  }, []);

  const fetchFeatureAccess = async () => {
    try {
      // This would fetch from your API
      const response = await fetch('/api/user/feature-access', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFeatureAccess(data);
      } else {
        // Default to Basic plan if API fails
        setFeatureAccess({
          userPlan: 'Basic',
          locked: ['advanced_reports', 'bulk_upload', 'priority_support', 'unlimited_messaging'],
          unlocked: ['basic_dashboard', 'standard_messaging'],
        });
      }
    } catch (error) {
      console.error('Failed to fetch feature access:', error);
      // Default to Basic plan
      setFeatureAccess({
        userPlan: 'Basic',
        locked: ['advanced_reports', 'bulk_upload', 'priority_support', 'unlimited_messaging'],
        unlocked: ['basic_dashboard', 'standard_messaging'],
      });
    } finally {
      setLoading(false);
    }
  };

  const isFeatureLocked = (featureKey: string): boolean => {
    return featureAccess.locked.includes(featureKey);
  };

  const isFeatureUnlocked = (featureKey: string): boolean => {
    return featureAccess.unlocked.includes(featureKey);
  };

  const getRequiredPlan = (featureKey: string): 'Professional' | 'Enterprise' => {
    const professionalFeatures = [
      'advanced_reports',
      'bulk_upload',
      'unlimited_messaging',
      'priority_support',
      'custom_branding',
      'advanced_analytics',
      'unlimited_documents',
      'priority_matching'
    ];
    
    return professionalFeatures.includes(featureKey) ? 'Professional' : 'Enterprise';
  };

  const getFeatureBenefit = (featureKey: string): string => {
    const benefits: Record<string, string> = {
      'advanced_reports': 'Unlock advanced analytics to grow your daycare faster',
      'bulk_upload': 'Save hours with bulk operations and batch processing',
      'priority_support': 'Get priority support for faster issue resolution',
      'unlimited_messaging': 'Send unlimited messages to parents and educators',
      'custom_branding': 'Customize your organization\'s branding and appearance',
      'advanced_analytics': 'Access detailed insights and performance metrics',
      'unlimited_documents': 'Upload unlimited documents and files',
      'priority_matching': 'Get priority placement in search results',
    };
    
    return benefits[featureKey] || 'Unlock this premium feature';
  };

  const upgradeToPlan = async (targetPlan: 'Professional' | 'Enterprise'): Promise<boolean> => {
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ targetPlan }),
      });

      if (response.ok) {
        // Refresh feature access after successful upgrade
        await fetchFeatureAccess();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      return false;
    }
  };

  const getUpgradeUrl = (featureKey: string): string => {
    const requiredPlan = getRequiredPlan(featureKey);
    return `/pricing?plan=${requiredPlan.toLowerCase()}&feature=${featureKey}`;
  };

  return {
    featureAccess,
    loading,
    isFeatureLocked,
    isFeatureUnlocked,
    getRequiredPlan,
    getFeatureBenefit,
    upgradeToPlan,
    getUpgradeUrl,
    refreshFeatureAccess: fetchFeatureAccess,
  };
}

// Feature definitions for the platform
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Generate detailed analytics and custom reports',
    requiredPlan: 'Professional',
    benefit: 'Unlock advanced analytics to grow your daycare faster',
  },
  {
    key: 'bulk_upload',
    name: 'Bulk Operations',
    description: 'Upload and process multiple items at once',
    requiredPlan: 'Professional',
    benefit: 'Save hours with bulk operations and batch processing',
  },
  {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Get faster response times and dedicated support',
    requiredPlan: 'Professional',
    benefit: 'Get priority support for faster issue resolution',
  },
  {
    key: 'unlimited_messaging',
    name: 'Unlimited Messaging',
    description: 'Send unlimited messages to parents and educators',
    requiredPlan: 'Professional',
    benefit: 'Send unlimited messages to parents and educators',
  },
  {
    key: 'custom_branding',
    name: 'Custom Branding',
    description: 'Customize your organization\'s appearance',
    requiredPlan: 'Professional',
    benefit: 'Customize your organization\'s branding and appearance',
  },
  {
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Access detailed insights and performance metrics',
    requiredPlan: 'Professional',
    benefit: 'Access detailed insights and performance metrics',
  },
  {
    key: 'unlimited_documents',
    name: 'Unlimited Documents',
    description: 'Upload unlimited documents and files',
    requiredPlan: 'Professional',
    benefit: 'Upload unlimited documents and files',
  },
  {
    key: 'priority_matching',
    name: 'Priority Matching',
    description: 'Get priority placement in search results',
    requiredPlan: 'Professional',
    benefit: 'Get priority placement in search results',
  },
];

async function getAuthToken(): Promise<string> {
  // This would be implemented based on your auth setup
  // For now, return empty string
  return '';
}