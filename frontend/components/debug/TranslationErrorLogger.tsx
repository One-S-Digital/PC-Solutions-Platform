import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface TranslationErrorLoggerProps {
  enabled?: boolean;
  logToFile?: boolean;
  logToConsole?: boolean;
  autoScan?: boolean;
  scanInterval?: number; // in milliseconds
}

interface TranslationError {
  key: string;
  returned: string;
  expected: string;
  timestamp: string;
  language: string;
  page: string;
  severity: 'missing' | 'fallback' | 'error';
}

interface ErrorLog {
  timestamp: string;
  language: string;
  totalErrors: number;
  errors: TranslationError[];
  summary: {
    missingKeys: number;
    fallbackKeys: number;
    errorKeys: number;
  };
}

const TranslationErrorLogger: React.FC<TranslationErrorLoggerProps> = ({
  enabled = true,
  logToFile = true,
  logToConsole = true,
  autoScan = true,
  scanInterval = 30000 // 30 seconds
}) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [errors, setErrors] = useState<TranslationError[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  // Comprehensive list of keys to check
  const getAllKeysToCheck = useCallback(() => {
    const keys: string[] = [];
    
    // Get all keys from the current resource bundle
    const resourceBundle = i18nInstance.getResourceBundle(i18nInstance.language, 'translation');
    if (resourceBundle) {
      const extractKeys = (obj: any, prefix = ''): string[] => {
        const result: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'string') {
            result.push(fullKey);
          } else if (typeof value === 'object' && value !== null) {
            result.push(...extractKeys(value, fullKey));
          }
        }
        return result;
      };
      keys.push(...extractKeys(resourceBundle));
    }

    // Add comprehensive common keys that should always exist
    const commonKeys = [
      // App core
      'appName',
      'loading',
      
      // Language switcher
      'languageSwitcher.enShort',
      'languageSwitcher.enLong',
      'languageSwitcher.frShort',
      'languageSwitcher.frLong',
      'languageSwitcher.deShort',
      'languageSwitcher.deLong',
      'languageSwitcher.selectLanguage',
      
      // Buttons
      'buttons.save',
      'buttons.saveChanges',
      'buttons.cancel',
      'buttons.submit',
      'buttons.add',
      'buttons.edit',
      'buttons.delete',
      'buttons.viewDetails',
      'buttons.goBack',
      'buttons.login',
      'buttons.signup',
      'buttons.applyNow',
      'buttons.confirmApply',
      'buttons.sendMessage',
      'buttons.inviteToApply',
      'buttons.inviteToInterview',
      'buttons.addToFavorites',
      'buttons.favorited',
      'buttons.submitEnquiry',
      'buttons.viewMyEnquiries',
      'buttons.submitTicket',
      'buttons.goToLogin',
      'buttons.close',
      'buttons.view',
      'buttons.resetFilters',
      'buttons.applyFilters',
      'buttons.submitRequest',
      'buttons.remove',
      'buttons.dismiss',
      
      // Navbar
      'navbar.searchPlaceholder',
      'navbar.login',
      'navbar.signup',
      'navbar.dashboard',
      'navbar.messages',
      'navbar.notifications',
      'navbar.profile',
      'navbar.settings',
      'navbar.logout',
      'navbar.userMenu.profile',
      'navbar.userMenu.settings',
      'navbar.userMenu.logout',
      
      // Sidebar
      'sidebar.dashboard',
      'sidebar.marketplace',
      'sidebar.products',
      'sidebar.services',
      'sidebar.orders',
      'sidebar.productMarketplace',
      'sidebar.serviceMarketplace',
      'sidebar.ordersAppointments',
      'sidebar.parentLeads',
      'sidebar.recruitment',
      'sidebar.jobListings',
      'sidebar.candidatePool',
      'sidebar.hrProcedures',
      'sidebar.eLearning',
      'sidebar.statePolicies',
      'sidebar.analytics',
      'sidebar.messages',
      'sidebar.organisationProfile',
      'sidebar.support',
      'sidebar.jobBoard',
      'sidebar.myProfile',
      'sidebar.applications',
      'sidebar.homeFindCreche',
      'sidebar.myRequests',
      'sidebar.supportFAQ',
      'sidebar.users',
      'sidebar.allUsers',
      'sidebar.admins',
      'sidebar.foundations',
      'sidebar.productSuppliers',
      'sidebar.serviceProviders',
      'sidebar.parents',
      'sidebar.content',
      'sidebar.partners',
      'sidebar.settings',
      'sidebar.managePlan',
      'sidebar.billingSubscription',
      'sidebar.premiumPlan',
      'sidebar.premiumPlanDesc',
      'sidebar.fileGallery',
      'sidebar.systemMonitoring',
      'sidebar.platformSettings',
      'sidebar.designSystem',
      'sidebar.discountTerminations',
      'sidebar.currentPlan',
      'sidebar.manageSubscriptionDesc',
      
      // Common
      'common.loading',
      'common.error',
      'common.success',
      'common.name',
      'common.email',
      'common.phone',
      'common.address',
      'common.description',
      'common.status',
      'common.active',
      'common.inactive',
      'common.pending',
      'common.completed',
      'common.date',
      'common.createdAt',
      'common.updatedAt',
      'common.actions',
      'common.yes',
      'common.no',
      'common.ok',
      'common.perMonth',
      'common.perYear',
      'common.save10Percent',
      
      // Errors
      'errors.unknown',
      
      // Notifications
      'notifications.successTitle',
      'notifications.settingsUpdated',
      
      // Password
      'hidePassword',
      'showPassword',
      
      // Auth
      'signIn',
      'signOut',
      'confirmPassword',
      'resetPassword',
      'rememberMe',
      'createAccount',
      'alreadyHaveAccount',
      'dontHaveAccount',
      'welcomeBack',
      'joinPlatform',
      'chooseRole',
      'firstName',
      'lastName',
      'phoneNumber',
      'organizationName',
      'contactPerson',
      'canton',
      'languages',
      'capacity',
      'productCategory',
      'serviceType',
      'childAge',
      'preferredLocation',
      
      // Login page
      'loginPage.title',
      'loginPage.subtitle',
      'loginPage.errorBothFields',
      'loginPage.emailLabel',
      'loginPage.emailPlaceholder',
      'loginPage.passwordLabel',
      'loginPage.passwordPlaceholder',
      'loginPage.loggingIn',
      'loginPage.orContinueWith',
      'loginPage.google',
      'loginPage.facebook',
      'loginPage.noAccount',
      'loginPage.viewPlansPrompt',
      'loginPage.viewPlans',
      'loginPage.parentLookingForCreche',
      'loginPage.findCrecheHere',
      'loginPage.forgotPassword',
      'loginPage.forgotPasswordTBD',
      'loginPage.socialLoginTBD',
      
      // Signup page
      'signupPage.title',
      'signupPage.subtitle',
      'signupPage.createAccountTitle',
      'signupPage.roleLabel',
      'signupPage.roleDescription',
      'signupPage.verifyEmail',
      'signupPage.verifyEmailDescription',
      'signupPage.verificationCode',
      'signupPage.superAdmin.label',
      'signupPage.superAdmin.description',
      'signupPage.admin.label',
      'signupPage.admin.description',
      'signupPage.foundation.label',
      'signupPage.foundation.description',
      'signupPage.productSupplier.label',
      'signupPage.productSupplier.description',
      'signupPage.serviceProvider.label',
      'signupPage.serviceProvider.description',
      'signupPage.educator.label',
      'signupPage.educator.description',
      'signupPage.parent.label',
      'signupPage.parent.description',
      
      // Dashboard page
      'dashboardPage.welcome',
      'dashboardPage.defaultUser',
      'dashboardPage.overviewSubtitle',
      'dashboardPage.activeUsers',
      'dashboardPage.newOrders',
      'dashboardPage.openJobs',
      'dashboardPage.pageViews',
      'dashboardPage.recentActivity',
      'dashboardPage.quickLinks',
      'dashboardPage.browseMarketplace',
      'dashboardPage.postNewJob',
      'dashboardPage.manageUsers',
      'dashboardPage.platformSettings',
      'dashboardPage.activityLina',
      'dashboardPage.activityEcoToys',
      'dashboardPage.activityJohn',
      'dashboardPage.activityParent',
      'dashboardPage.viewDetailsFor',
      'dashboardPage.timeAgo.minutes',
      'dashboardPage.timeAgo.hours',
      'dashboardPage.timeAgo.yesterday',
      'dashboardPage.upcomingMeetings',
      'dashboardPage.quickActions',
      'dashboardPage.overview',
      'dashboardPage.announcements',
      'dashboardPage.notifications',
      
      // Settings page
      'settingsPage.title',
      'settingsPage.general',
      'settingsPage.notifications',
      'settingsPage.account',
      'settingsPage.appearance',
      'settingsPage.language',
      'settingsPage.privacySecurity',
      'settingsPage.billingSubscription',
      'settingsPage.organizationProfile',
      'settingsPage.userPreferences',
      'settingsPage.unsavedChangesPrompt',
      'settingsPage.loading',
      'settingsPage.noSectionsAvailable',
      
      // All other page sections...
      'marketplacePage.title',
      'marketplacePage.tabs.productSuppliers',
      'marketplacePage.tabs.serviceProviders',
      'marketplacePage.serviceCard.categoryLabel',
      'marketplacePage.serviceCard.bookAppointment',
      'marketplacePage.serviceCard.viewProvider',
      'marketplacePage.emptyStates.noProductSuppliers',
      'marketplacePage.emptyStates.noServiceProviders',
      
      'partnerDetailPage.onlyFoundationsRequestService',
      'partnerDetailPage.requestSubmittedAlert',
      
      'adminPlatformSettings.title',
      'adminPlatformSettings.general.title',
      'adminPlatformSettings.general.nameLabel',
      'adminPlatformSettings.general.descriptionLabel',
      'adminPlatformSettings.branding.title',
      'adminPlatformSettings.branding.logoLabel',
      'adminPlatformSettings.branding.faviconLabel',
      
      'organizationProfileForm.saveSuccess',
      
      // Foundation pages
      'foundationDashboardPage.title',
      'foundationDashboardPage.welcome',
      'foundationDashboardPage.overview',
      'foundationDashboardPage.recentActivity',
      'foundationDashboardPage.quickActions',
      
      'foundationAnalyticsPage.title',
      'foundationAnalyticsPage.overview',
      'foundationAnalyticsPage.metrics',
      
      'foundationLeadsPage.title',
      'foundationLeadsPage.leads',
      'foundationLeadsPage.newLeads',
      'foundationLeadsPage.contactedLeads',
      
      'foundationOrdersAppointmentsPage.title',
      'foundationOrdersAppointmentsPage.orders',
      'foundationOrdersAppointmentsPage.appointments',
      
      'foundationOrganisationProfilePage.title',
      'foundationOrganisationProfilePage.profile',
      'foundationOrganisationProfilePage.settings',
      
      'foundationSupportPage.title',
      'foundationSupportPage.help',
      'foundationSupportPage.tickets',
      
      // Parent pages
      'parentDashboardPage.title',
      'parentDashboardPage.welcome',
      'parentDashboardPage.myChildren',
      'parentDashboardPage.findCreche',
      
      'parentEnquiriesPage.title',
      'parentEnquiriesPage.enquiries',
      'parentEnquiriesPage.newEnquiry',
      
      'parentSupportPage.title',
      'parentSupportPage.help',
      'parentSupportPage.faq',
      
      // Educator pages
      'educatorDashboardPage.title',
      'educatorDashboardPage.welcome',
      'educatorDashboardPage.applications',
      'educatorDashboardPage.jobBoard',
      
      'educatorApplicationsPage.title',
      'educatorApplicationsPage.applications',
      'educatorApplicationsPage.status',
      
      'educatorJobBoardPage.title',
      'educatorJobBoardPage.jobs',
      'educatorJobBoardPage.apply',
      
      'educatorProfilePage.title',
      'educatorProfilePage.profile',
      'educatorProfilePage.experience',
      
      'educatorSupportPage.title',
      'educatorSupportPage.help',
      
      // Service provider pages
      'serviceProviderDashboardPage.title',
      'serviceProviderDashboardPage.welcome',
      'serviceProviderDashboardPage.services',
      'serviceProviderDashboardPage.requests',
      
      'serviceProviderAnalyticsPage.title',
      'serviceProviderAnalyticsPage.overview',
      'serviceProviderAnalyticsPage.performance',
      
      'serviceProviderListingsPage.title',
      'serviceProviderListingsPage.listings',
      'serviceProviderListingsPage.addService',
      
      'serviceProviderRequestsPage.title',
      'serviceProviderRequestsPage.requests',
      'serviceProviderRequestsPage.pending',
      
      'serviceProviderSupportPage.title',
      'serviceProviderSupportPage.help',
      
      // Supplier pages
      'supplierDashboardPage.title',
      'supplierDashboardPage.welcome',
      'supplierDashboardPage.products',
      'supplierDashboardPage.orders',
      
      'supplierAnalyticsPage.title',
      'supplierAnalyticsPage.overview',
      'supplierAnalyticsPage.sales',
      
      'supplierProductListingsPage.title',
      'supplierProductListingsPage.listings',
      'supplierProductListingsPage.addProduct',
      
      'supplierOrdersPage.title',
      'supplierOrdersPage.orders',
      'supplierOrdersPage.pending',
      
      'supplierSupportPage.title',
      'supplierSupportPage.help',
      
      // Admin pages
      'adminContentManagementDashboardPage.title',
      'adminContentManagementDashboardPage.content',
      'adminContentManagementDashboardPage.policies',
      'adminContentManagementDashboardPage.announcements',
      
      'adminSystemMonitoringPage.title',
      'adminSystemMonitoringPage.monitoring',
      'adminSystemMonitoringPage.performance',
      'adminSystemMonitoringPage.logs',
      
      'adminDiscountTerminationsPage.title',
      'adminDiscountTerminationsPage.terminations',
      'adminDiscountTerminationsPage.manage',
      
      // General pages
      'pricingPage.title',
      'pricingPage.plans',
      'pricingPage.features',
      'pricingPage.billing',
      
      'recruitmentPage.title',
      'recruitmentPage.jobs',
      'recruitmentPage.candidates',
      'recruitmentPage.postJob',
      
      'messagesPage.title',
      'messagesPage.conversations',
      'messagesPage.newMessage',
      
      'notificationsPage.title',
      'notificationsPage.notifications',
      'notificationsPage.unread',
      
      'fileGalleryPage.title',
      'fileGalleryPage.files',
      'fileGalleryPage.upload',
      
      'eLearningPage.title',
      'eLearningPage.courses',
      'eLearningPage.progress',
      
      'statePoliciesPage.title',
      'statePoliciesPage.policies',
      'statePoliciesPage.compliance',
      
      'hrProceduresPage.title',
      'hrProceduresPage.procedures',
      'hrProceduresPage.guidelines',
      
      'usersPage.title',
      'usersPage.allUsers',
      'usersPage.roles',
      
      'partnersPage.title',
      'partnersPage.partners',
      'partnersPage.becomePartner',
      
      'parentLeadFormPage.title',
      'parentLeadFormPage.form',
      'parentLeadFormPage.submit',
      
      'candidateProfilePage.title',
      'candidateProfilePage.profile',
      'candidateProfilePage.experience',
      
      'designSystemPage.title',
      'designSystemPage.components',
      'designSystemPage.guidelines',
      
      // Stock status
      'stockStatus.instock',
      'stockStatus.outofstock',
      'stockStatus.lowstock',
      'stockStatus.discontinued'
    ];

    // Combine and deduplicate
    return [...new Set([...keys, ...commonKeys])];
  }, [i18nInstance]);

  const detectTranslationErrors = useCallback((): TranslationError[] => {
    const detectedErrors: TranslationError[] = [];
    const keysToCheck = getAllKeysToCheck();
    const currentPage = window.location.pathname;
    const currentLanguage = i18nInstance.language;

    // Method 1: Check all known translation keys
    keysToCheck.forEach(key => {
      const result = t(key);
      const timestamp = new Date().toISOString();
      
      // Ensure result is a string for processing
      const resultString = typeof result === 'string' ? result : String(result);
      
      // Check for different types of errors
      if (result === key) {
        // Missing translation - key returned as-is
        detectedErrors.push({
          key,
          returned: result,
          expected: 'Actual translated text',
          timestamp,
          language: currentLanguage,
          page: currentPage,
          severity: 'missing'
        });
      } else if (resultString.includes('translation') && resultString.includes('missing')) {
        // i18next missing key error
        detectedErrors.push({
          key,
          returned: resultString,
          expected: 'Actual translated text',
          timestamp,
          language: currentLanguage,
          page: currentPage,
          severity: 'error'
        });
      } else if (resultString.includes('{{') && resultString.includes('}}') && !resultString.includes('{{count}}') && !resultString.includes('{{name}}')) {
        // Potential interpolation error
        detectedErrors.push({
          key,
          returned: resultString,
          expected: 'Properly interpolated text',
          timestamp,
          language: currentLanguage,
          page: currentPage,
          severity: 'fallback'
        });
      } else if (resultString.length < 2) {
        // Very short or empty result
        detectedErrors.push({
          key,
          returned: resultString,
          expected: 'Meaningful translated text',
          timestamp,
          language: currentLanguage,
          page: currentPage,
          severity: 'missing'
        });
      }
    });

    // Method 2: Scan DOM for translation strings (keys that look like translation keys)
    try {
      const allTextElements = document.querySelectorAll('*');
      allTextElements.forEach(element => {
        const text = element.textContent || '';
        
        // Look for patterns that look like translation keys
        const translationKeyPattern = /^[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/;
        const commonKeyPatterns = [
          /^[a-zA-Z]+Page\.[a-zA-Z]+$/,
          /^buttons\.[a-zA-Z]+$/,
          /^navbar\.[a-zA-Z]+$/,
          /^sidebar\.[a-zA-Z]+$/,
          /^common\.[a-zA-Z]+$/,
          /^errors\.[a-zA-Z]+$/,
          /^notifications\.[a-zA-Z]+$/
        ];
        
        if (text && text.length > 3 && text.length < 100) {
          const isTranslationKey = translationKeyPattern.test(text) || 
            commonKeyPatterns.some(pattern => pattern.test(text));
          
          if (isTranslationKey) {
            // Check if this key actually has a translation
            const translation = t(text);
            if (translation === text) {
              detectedErrors.push({
                key: text,
                returned: text,
                expected: 'Actual translated text',
                timestamp: new Date().toISOString(),
                language: currentLanguage,
                page: currentPage,
                severity: 'missing'
              });
            }
          }
        }
      });
    } catch (error) {
      console.warn('DOM scanning failed:', error);
    }

    // Method 3: Check for common translation string patterns in visible text
    try {
      const visibleElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a, label, input[placeholder]');
      visibleElements.forEach(element => {
        const text = element.textContent || element.getAttribute('placeholder') || '';
        
        // Look for dot notation patterns that might be translation keys
        if (text && typeof text === 'string' && text.includes('.') && text.length > 5 && text.length < 50) {
          const parts = text.split('.');
          if (parts.length >= 2 && parts.every(part => /^[a-zA-Z][a-zA-Z0-9]*$/.test(part))) {
            // This looks like a translation key
            const translation = t(text);
            if (translation === text) {
              detectedErrors.push({
                key: text,
                returned: text,
                expected: 'Actual translated text',
                timestamp: new Date().toISOString(),
                language: currentLanguage,
                page: currentPage,
                severity: 'missing'
              });
            }
          }
        }
      });
    } catch (error) {
      console.warn('Visible text scanning failed:', error);
    }

    // Remove duplicates based on key
    const uniqueErrors = detectedErrors.filter((error, index, self) => 
      index === self.findIndex(e => e.key === error.key)
    );

    return uniqueErrors;
  }, [t, i18nInstance, getAllKeysToCheck]);

  const logErrorsToFile = useCallback(async (errorLog: ErrorLog) => {
    if (!logToFile) return;

    try {
      // Send error log to backend API to save to git repository
      const response = await fetch('/api/translation-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...errorLog,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer
        })
      });

      if (response.ok) {
        console.log('✅ Translation errors logged to git repository');
      } else {
        console.error('❌ Failed to log errors to repository:', response.statusText);
        // Fallback to console logging
        console.log('📝 Translation Error Log (Fallback):', errorLog);
      }
    } catch (error) {
      console.error('❌ Failed to log errors to repository:', error);
      // Fallback to console logging
      console.log('📝 Translation Error Log (Fallback):', errorLog);
    }
  }, [logToFile]);

  const logErrorsToConsole = useCallback((errorLog: ErrorLog) => {
    if (!logToConsole) return;

    console.group('🔍 Translation Error Log');
    console.log('📊 Summary:', errorLog.summary);
    console.log('🌍 Language:', errorLog.language);
    console.log('⏰ Timestamp:', errorLog.timestamp);
    console.log('📄 Total Errors:', errorLog.totalErrors);
    
    console.group('❌ Missing Keys');
    errorLog.errors.filter(e => e.severity === 'missing').forEach(error => {
      console.log(`• ${error.key} (${error.page})`);
    });
    console.groupEnd();
    
    console.group('⚠️ Fallback Keys');
    errorLog.errors.filter(e => e.severity === 'fallback').forEach(error => {
      console.log(`• ${error.key}: "${error.returned}" (${error.page})`);
    });
    console.groupEnd();
    
    console.group('💥 Error Keys');
    errorLog.errors.filter(e => e.severity === 'error').forEach(error => {
      console.log(`• ${error.key}: "${error.returned}" (${error.page})`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }, [logToConsole]);

  const runErrorScan = useCallback(() => {
    if (!enabled) return;

    setIsScanning(true);
    const detectedErrors = detectTranslationErrors();
    setErrors(detectedErrors);
    setLastScanTime(new Date().toLocaleString());

    if (detectedErrors.length > 0) {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        language: i18nInstance.language,
        totalErrors: detectedErrors.length,
        errors: detectedErrors,
        summary: {
          missingKeys: detectedErrors.filter(e => e.severity === 'missing').length,
          fallbackKeys: detectedErrors.filter(e => e.severity === 'fallback').length,
          errorKeys: detectedErrors.filter(e => e.severity === 'error').length,
        }
      };

      logErrorsToConsole(errorLog);
      logErrorsToFile(errorLog);
    }

    setIsScanning(false);
  }, [enabled, detectTranslationErrors, i18nInstance.language, logErrorsToConsole, logErrorsToFile]);

  // Auto-scan effect
  useEffect(() => {
    if (!enabled || !autoScan) return;

    // Initial scan
    runErrorScan();

    // Set up interval
    const interval = setInterval(runErrorScan, scanInterval);

    // Listen for language changes
    const handleLanguageChanged = () => {
      setTimeout(runErrorScan, 1000); // Delay to ensure resources are loaded
    };

    // Listen for route changes (page navigation)
    const handleRouteChange = () => {
      setTimeout(runErrorScan, 2000); // Delay to ensure page is fully loaded
    };

    // Listen for DOM changes (new content loaded)
    const observer = new MutationObserver(() => {
      setTimeout(runErrorScan, 1000); // Debounced scan
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    i18nInstance.on('languageChanged', handleLanguageChanged);
    i18nInstance.on('loaded', handleLanguageChanged);
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleRouteChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleRouteChange();
    };

    return () => {
      clearInterval(interval);
      observer.disconnect();
      i18nInstance.off('languageChanged', handleLanguageChanged);
      i18nInstance.off('loaded', handleLanguageChanged);
      window.removeEventListener('popstate', handleRouteChange);
      
      // Restore original methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [enabled, autoScan, scanInterval, runErrorScan, i18nInstance]);

  if (!enabled) return null;

  const summary = {
    missingKeys: errors.filter(e => e.severity === 'missing').length,
    fallbackKeys: errors.filter(e => e.severity === 'fallback').length,
    errorKeys: errors.filter(e => e.severity === 'error').length,
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-orange-500 text-white px-3 py-2 rounded text-sm font-mono shadow-lg"
      >
        📝 Error Logger {isVisible ? '▼' : '▶'} {errors.length > 0 && `(${errors.length})`}
      </button>
      
      {isVisible && (
        <div className="absolute top-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md max-h-96 overflow-auto">
          <div className="text-xs font-mono space-y-3">
            <div className="flex justify-between items-center">
              <div className="font-bold text-orange-600">{t("translationErrorLogger.title")}</div>
              <button
                onClick={runErrorScan}
                disabled={isScanning}
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>

            {/* Summary */}
            <div>
              <strong className="text-green-600">{t("translationErrorLogger.errorSummary")}:</strong>
              <div className="ml-2 space-y-1">
                <div>Total Errors: {errors.length}</div>
                <div>Missing Keys: {summary.missingKeys}</div>
                <div>Fallback Keys: {summary.fallbackKeys}</div>
                <div>Error Keys: {summary.errorKeys}</div>
                <div>Last Scan: {lastScanTime || 'Never'}</div>
              </div>
            </div>

            {/* Recent Errors */}
            {errors.length > 0 && (
              <div>
                <strong className="text-red-600">{t("translationErrorLogger.recentErrors")}:</strong>
                <div className="ml-2 max-h-32 overflow-y-auto space-y-1">
                  {errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-xs">
                      <div className={`font-mono ${
                        error.severity === 'missing' ? 'text-red-600' :
                        error.severity === 'fallback' ? 'text-yellow-600' :
                        'text-orange-600'
                      }`}>
                        {error.severity === 'missing' ? '❌' : 
                         error.severity === 'fallback' ? '⚠️' : '💥'} {error.key}
                      </div>
                      <div className="text-gray-500 ml-2">
                        "{error.returned}" ({error.page})
                      </div>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <div className="text-gray-500 text-xs">... and {errors.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={() => {
                  const errorLog: ErrorLog = {
                    timestamp: new Date().toISOString(),
                    language: i18nInstance.language,
                    totalErrors: errors.length,
                    errors,
                    summary
                  };
                  logErrorsToFile(errorLog);
                }}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs"
              >
{t("translationErrorLogger.logToGit")}
              </button>
              <button
                onClick={() => {
                  const errorLog: ErrorLog = {
                    timestamp: new Date().toISOString(),
                    language: i18nInstance.language,
                    totalErrors: errors.length,
                    errors,
                    summary
                  };
                  logErrorsToConsole(errorLog);
                }}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
              >
{t("translationErrorLogger.logToConsole")}
              </button>
              <button
                onClick={() => {
                  const missingKeys = errors
                    .filter(e => e.severity === 'missing')
                    .map(e => e.key)
                    .join('\n');
                  navigator.clipboard.writeText(missingKeys);
                  alert('Missing keys copied to clipboard!');
                }}
                className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
              >
{t("translationErrorLogger.copyMissing")}
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/translation-errors/commit-logs');
                    const result = await response.json();
                    if (result.success) {
                      alert(`✅ ${result.message}\nFiles committed: ${result.filesCommitted}`);
                    } else {
                      alert(`❌ ${result.message}`);
                    }
                  } catch (error) {
                    alert(`❌ Failed to commit logs: ${error.message}`);
                  }
                }}
                className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
              >
{t("translationErrorLogger.commitToGit")}
              </button>
            </div>

            {/* Settings */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              <div>Auto-scan: {autoScan ? 'ON' : 'OFF'}</div>
              <div>Interval: {scanInterval / 1000}s</div>
              <div>Log to file: {logToFile ? 'ON' : 'OFF'}</div>
              <div>Log to console: {logToConsole ? 'ON' : 'OFF'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationErrorLogger;