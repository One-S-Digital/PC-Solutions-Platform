import React from 'react';

const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <img
          src="/maintenance.gif"
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
    </div>
  );
};

export default MaintenancePage;
