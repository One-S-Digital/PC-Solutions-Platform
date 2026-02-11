import React, { useEffect } from 'react';
import { TaskChooseOrganization, useAuth, useSession } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/design-system/Card';

export default function ChooseOrganization() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (session?.currentTask) return;
    navigate('/dashboard', { replace: true });
  }, [isLoaded, isSignedIn, session?.currentTask, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 shadow-xl">
        <TaskChooseOrganization redirectUrlComplete="/dashboard" />
      </Card>
    </div>
  );
}

