import React from 'react';
import { Link } from 'react-router-dom';
import maintenanceGif from '../assets/maintenance.gif';

const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <img
          src={maintenanceGif}
          alt="Site under maintenance"
          className="w-80 h-auto mx-auto mb-8"
        />
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-3">
          Site Under Maintenance
        </h1>
        <p className="text-lg text-gray-500">
          Site will be live again soon
        </p>
      </div>
      <p className="absolute bottom-6 text-xs text-gray-300">
        <Link to="/login?admin=1" className="hover:text-gray-400 transition-colors">
          Administrator login
        </Link>
      </p>
    </div>
  );
};

export default MaintenancePage;
