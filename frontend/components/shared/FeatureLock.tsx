
import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface FeatureLockProps {
  featureName: string;
  requiredPlan: string;
}

const FeatureLock: React.FC<FeatureLockProps> = ({ featureName, requiredPlan }) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  return (
    <Card className="p-10 text-center">
      <LockClosedIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
      <h2 className="text-2xl font-bold text-swiss-charcoal mb-2">{t('featureLock.title', { featureName })}</h2>
      <p className="text-gray-600 mb-6">{t('featureLock.message', { requiredPlan })}</p>
      <Button variant="primary" onClick={() => navigate('/pricing')}>
        {t('featureLock.upgradeButton')}
      </Button>
    </Card>
  );
};

export default FeatureLock;
