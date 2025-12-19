import { useMaintenanceStore } from '../stores/maintenance.store';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/solid';

export const MaintenanceBanner = () => {
  const { enabled, message } = useMaintenanceStore();

  if (!enabled) return null;

  return (
    <div className="bg-yellow-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center flex-1">
            <WrenchScrewdriverIcon className="h-6 w-6 mr-3 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">
                🔧 Maintenance Mode Active
              </p>
              {message && (
                <p className="text-sm mt-1 text-yellow-100">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
