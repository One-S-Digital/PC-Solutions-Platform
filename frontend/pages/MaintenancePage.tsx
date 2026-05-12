import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import maintenanceGif from '../assets/maintenance.gif';

const MaintenancePage: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-swiss-mint/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-swiss-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl xl:max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-medium text-swiss-charcoal hover:bg-swiss-teal hover:text-white hover:border-swiss-teal transition-all duration-200 group"
        >
          <svg
            className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('buttons.back')}</span>
        </button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-soft border border-gray-100 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14 text-center">
          {/* GIF — fluid: 100% on small screens, up to 640px on large */}
          <img
            src={maintenanceGif}
            alt={t('maintenancePage.title')}
            className="w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-[640px] h-auto mx-auto mb-6 sm:mb-8 drop-shadow-sm"
          />

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 sm:px-4 rounded-full mb-4 sm:mb-6">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {t('maintenancePage.status')}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-swiss-charcoal mb-3 sm:mb-4 tracking-tight">
            {t('maintenancePage.title')}
          </h1>

          <p className="text-base sm:text-lg text-gray-500 max-w-sm sm:max-w-md mx-auto leading-relaxed">
            {t('maintenancePage.subtitle')}
          </p>

          {/* Divider */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 rounded-full bg-swiss-mint" />
              <span className="w-2 h-2 rounded-full bg-swiss-sand" />
              <span className="w-2 h-2 rounded-full bg-swiss-coral" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin login link */}
      <p className="mt-6 text-xs text-gray-300 pb-2">
        <Link to="/login" className="hover:text-gray-400 transition-colors">
          {t('maintenancePage.adminLogin')}
        </Link>
      </p>
    </div>
  );
};

export default MaintenancePage;
