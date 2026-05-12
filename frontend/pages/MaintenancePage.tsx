import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import maintenanceGif from '../assets/maintenance.gif';

const MaintenancePage: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-swiss-mint/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-swiss-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-swiss-teal transition-colors mb-6 group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('buttons.back')}</span>
        </button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-soft border border-gray-100 px-8 py-12 text-center">
          {/* GIF — doubled from w-80 (320px) to 640px */}
          <img
            src={maintenanceGif}
            alt={t('maintenancePage.title')}
            className="w-[640px] max-w-full h-auto mx-auto mb-8 drop-shadow-sm"
          />

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {t('maintenancePage.status')}
          </div>

          <h1 className="text-4xl font-bold text-swiss-charcoal mb-4 tracking-tight">
            {t('maintenancePage.title')}
          </h1>

          <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
            {t('maintenancePage.subtitle')}
          </p>

          {/* Divider */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 rounded-full bg-swiss-mint" />
              <span className="w-2 h-2 rounded-full bg-swiss-sand" />
              <span className="w-2 h-2 rounded-full bg-swiss-coral" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin login link */}
      <p className="absolute bottom-6 text-xs text-gray-300">
        <Link to="/login" className="hover:text-gray-400 transition-colors">
          {t('maintenancePage.adminLogin')}
        </Link>
      </p>
    </div>
  );
};

export default MaintenancePage;
