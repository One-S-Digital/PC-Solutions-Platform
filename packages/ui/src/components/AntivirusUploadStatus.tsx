import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface AntivirusUploadStatusProps {
  isScanning: boolean;
  scanResult?: 'clean' | 'infected' | 'error';
  errorMessage?: string;
  className?: string;
}

export function AntivirusUploadStatus({
  isScanning,
  scanResult,
  errorMessage,
  className,
}: AntivirusUploadStatusProps) {
  const { t } = useTranslation();

  if (isScanning) {
    return (
      <div className={clsx('flex items-center gap-3 p-4 bg-surface-2 rounded-lg', className)}>
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
        <div>
          <p className="text-text-strong font-medium">
            {t('antivirus.scanning', 'Scanning for viruses...')}
          </p>
          <p className="text-text-muted text-sm">
            {t('antivirus.scanningDescription', 'Please wait while we check your file for malware')}
          </p>
        </div>
      </div>
    );
  }

  if (scanResult === 'infected') {
    return (
      <div className={clsx('flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-lg', className)}>
        <div className="bg-danger text-danger-contrast rounded-full p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-danger font-medium">
            {t('antivirus.infected', 'Upload blocked')}
          </p>
          <p className="text-danger/80 text-sm">
            {t('antivirus.infectedDescription', 'File contains harmful code. Try exporting a clean PDF/image and re-upload.')}
          </p>
        </div>
      </div>
    );
  }

  if (scanResult === 'error') {
    return (
      <div className={clsx('flex items-center gap-3 p-4 bg-warn/10 border border-warn/20 rounded-lg', className)}>
        <div className="bg-warn text-warn-contrast rounded-full p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-warn font-medium">
            {t('antivirus.scannerDown', 'Virus scanner temporarily unavailable')}
          </p>
          <p className="text-warn/80 text-sm">
            {t('antivirus.scannerDownDescription', 'Please retry in a moment.')}
          </p>
        </div>
      </div>
    );
  }

  if (scanResult === 'clean') {
    return (
      <div className={clsx('flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg', className)}>
        <div className="bg-success text-success-contrast rounded-full p-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-success font-medium">
            {t('antivirus.clean', 'File scanned successfully')}
          </p>
          <p className="text-success/80 text-sm">
            {t('antivirus.cleanDescription', 'Your file is clean and safe to use')}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// Antivirus Upload Hook
interface AntivirusUploadResult {
  success: boolean;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  safeLocation: string;
  scanResult: 'clean' | 'infected' | 'error';
  scanDetails?: string;
}

export function useAntivirusUpload() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'clean' | 'infected' | 'error' | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const uploadAndScan = async (file: File): Promise<AntivirusUploadResult | null> => {
    setIsScanning(true);
    setScanResult(undefined);
    setErrorMessage(undefined);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/antivirus-upload/scan', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setScanResult(result.scanResult);
        return result;
      } else {
        if (response.status === 400) {
          setScanResult('infected');
          setErrorMessage(result.message || 'File contains malware');
        } else if (response.status === 503) {
          setScanResult('error');
          setErrorMessage('Virus scanner unavailable');
        } else {
          setScanResult('error');
          setErrorMessage('Upload failed');
        }
        return null;
      }
    } catch (error) {
      setScanResult('error');
      setErrorMessage('Network error occurred');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health/clamav');
      const result = await response.json();
      return result.healthy;
    } catch (error) {
      return false;
    }
  };

  return {
    uploadAndScan,
    checkHealth,
    isScanning,
    scanResult,
    errorMessage,
  };
}

async function getAuthToken(): Promise<string> {
  // This would be implemented based on your auth setup
  // For now, return empty string
  return '';
}