import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GatedContent, 
  GatedCard, 
  GatedList, 
  FeatureLock, 
  FeatureAccessBadge, 
  UpgradeCTA 
} from '@repo/ui';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

export function GatedContentExample() {
  const { t } = useTranslation();
  const { featureAccess, isFeatureLocked, getFeatureBenefit } = useFeatureAccess();

  const handleUpgradeClick = () => {
    window.location.href = '/pricing';
  };

  const sampleReports = [
    {
      id: '1',
      title: 'Monthly Occupancy Report',
      description: 'Detailed analysis of occupancy rates across all branches',
      locked: isFeatureLocked('advanced_reports'),
      featureKey: 'advanced_reports',
      upgradeBenefit: getFeatureBenefit('advanced_reports'),
    },
    {
      id: '2',
      title: 'Parent Satisfaction Survey',
      description: 'Comprehensive feedback analysis and trends',
      locked: isFeatureLocked('advanced_reports'),
      featureKey: 'advanced_reports',
      upgradeBenefit: getFeatureBenefit('advanced_reports'),
    },
    {
      id: '3',
      title: 'Financial Performance Dashboard',
      description: 'Revenue, expenses, and profitability insights',
      locked: isFeatureLocked('advanced_reports'),
      featureKey: 'advanced_reports',
      upgradeBenefit: getFeatureBenefit('advanced_reports'),
    },
  ];

  const sampleFeatures = [
    {
      id: '1',
      title: 'Advanced Analytics',
      description: 'Get detailed insights into your daycare operations',
      locked: isFeatureLocked('advanced_analytics'),
      featureKey: 'advanced_analytics',
      upgradeBenefit: getFeatureBenefit('advanced_analytics'),
    },
    {
      id: '2',
      title: 'Bulk Document Upload',
      description: 'Upload multiple documents at once to save time',
      locked: isFeatureLocked('bulk_upload'),
      featureKey: 'bulk_upload',
      upgradeBenefit: getFeatureBenefit('bulk_upload'),
    },
    {
      id: '3',
      title: 'Priority Support',
      description: 'Get faster response times and dedicated support',
      locked: isFeatureLocked('priority_support'),
      featureKey: 'priority_support',
      upgradeBenefit: getFeatureBenefit('priority_support'),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-strong mb-4">
          {t('gated.example.title', 'Gated Content Examples')}
        </h1>
        <p className="text-text-muted">
          {t('gated.example.subtitle', 'See how gated content works with different subscription plans')}
        </p>
        <div className="mt-4">
          <FeatureAccessBadge 
            featureKey="advanced_reports" 
            userPlan={featureAccess.userPlan}
          />
        </div>
      </div>

      {/* Gated Cards Example */}
      <section>
        <h2 className="text-2xl font-semibold text-text-strong mb-4">
          {t('gated.example.cards', 'Gated Cards')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleReports.map((report) => (
            <GatedCard
              key={report.id}
              title={report.title}
              description={report.description}
              previewContent="This report shows detailed occupancy data, trends, and recommendations for optimizing your daycare operations..."
              locked={report.locked}
              featureKey={report.featureKey}
              upgradeBenefit={report.upgradeBenefit}
              userPlan={featureAccess.userPlan}
              onUpgradeClick={handleUpgradeClick}
            />
          ))}
        </div>
      </section>

      {/* Gated List Example */}
      <section>
        <h2 className="text-2xl font-semibold text-text-strong mb-4">
          {t('gated.example.list', 'Gated List')}
        </h2>
        <GatedList
          items={sampleFeatures}
          userPlan={featureAccess.userPlan}
          onUpgradeClick={handleUpgradeClick}
        />
      </section>

      {/* Gated Content Wrapper Example */}
      <section>
        <h2 className="text-2xl font-semibold text-text-strong mb-4">
          {t('gated.example.content', 'Gated Content Wrapper')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Locked Content */}
          <GatedContent
            locked={isFeatureLocked('advanced_reports')}
            featureKey="advanced_reports"
            previewContent="This advanced report provides detailed insights into occupancy patterns, revenue trends, and operational efficiency metrics..."
            upgradeBenefit={getFeatureBenefit('advanced_reports')}
            userPlan={featureAccess.userPlan}
            onUpgradeClick={handleUpgradeClick}
            className="bg-surface-1 border border-border rounded-lg p-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-text-strong mb-3">
                Advanced Occupancy Analytics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Total Capacity</span>
                  <span className="font-semibold text-text-strong">150 children</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Current Occupancy</span>
                  <span className="font-semibold text-text-strong">142 children</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Occupancy Rate</span>
                  <span className="font-semibold text-success">94.7%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Revenue Impact</span>
                  <span className="font-semibold text-success">+12.3%</span>
                </div>
              </div>
              <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                <h4 className="font-semibold text-text-strong mb-2">Recommendations</h4>
                <ul className="text-sm text-text-muted space-y-1">
                  <li>• Consider expanding capacity in high-demand areas</li>
                  <li>• Optimize pricing for peak occupancy periods</li>
                  <li>• Implement waitlist management for better forecasting</li>
                </ul>
              </div>
            </div>
          </GatedContent>

          {/* Unlocked Content */}
          <GatedContent
            locked={false}
            featureKey="basic_dashboard"
            upgradeBenefit=""
            userPlan={featureAccess.userPlan}
            className="bg-surface-1 border border-border rounded-lg p-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-text-strong mb-3">
                Basic Dashboard
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Total Children</span>
                  <span className="font-semibold text-text-strong">142</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Active Educators</span>
                  <span className="font-semibold text-text-strong">28</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-2 rounded">
                  <span className="text-text-default">Pending Applications</span>
                  <span className="font-semibold text-warn">15</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-success font-medium">Available on your plan</span>
              </div>
            </div>
          </GatedContent>
        </div>
      </section>

      {/* Feature Lock Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-text-strong mb-4">
          {t('gated.example.locks', 'Feature Lock Indicators')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-1 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-strong">Small Lock</h3>
              <FeatureLock featureKey="advanced_reports" size="sm" userPlan={featureAccess.userPlan} />
            </div>
            <p className="text-text-muted text-sm">Small lock indicator for compact spaces</p>
          </div>
          
          <div className="bg-surface-1 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-strong">Medium Lock</h3>
              <FeatureLock featureKey="bulk_upload" size="md" userPlan={featureAccess.userPlan} />
            </div>
            <p className="text-text-muted text-sm">Standard lock indicator for most use cases</p>
          </div>
          
          <div className="bg-surface-1 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-strong">Large Lock</h3>
              <FeatureLock featureKey="priority_support" size="lg" userPlan={featureAccess.userPlan} />
            </div>
            <p className="text-text-muted text-sm">Large lock indicator for emphasis</p>
          </div>
        </div>
      </section>

      {/* Upgrade CTA Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-text-strong mb-4">
          {t('gated.example.ctas', 'Upgrade CTA Examples')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-text-strong mb-3">Banner Style</h3>
            <UpgradeCTA
              featureKey="advanced_reports"
              upgradeBenefit={getFeatureBenefit('advanced_reports')}
              variant="banner"
              onClick={handleUpgradeClick}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-text-strong mb-3">Inline Style</h3>
            <UpgradeCTA
              featureKey="bulk_upload"
              upgradeBenefit={getFeatureBenefit('bulk_upload')}
              variant="inline"
              onClick={handleUpgradeClick}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-text-strong mb-3">Button Style</h3>
            <UpgradeCTA
              featureKey="priority_support"
              upgradeBenefit={getFeatureBenefit('priority_support')}
              variant="button"
              onClick={handleUpgradeClick}
            />
          </div>
        </div>
      </section>
    </div>
  );
}