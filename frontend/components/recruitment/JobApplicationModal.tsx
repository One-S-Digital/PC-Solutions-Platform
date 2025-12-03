import React, { useState } from 'react';
import { JobListing } from '../../types';
import Button from '../ui/Button';
import FileUploadZone from '../ui/FileUploadZone';
import { XMarkIcon, DocumentTextIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
  onSubmit: (data: {
    job: JobListing;
    cvAssetId: string;
    cvUrl: string;
    coverLetter: string;
  }) => void;
}

const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [coverLetter, setCoverLetter] = useState('');
  const [cvAsset, setCvAsset] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCvUpload = (asset: any) => {
    setCvAsset(asset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cvAsset) {
      alert('Please upload your CV/Resume');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        job,
        cvAssetId: cvAsset.id,
        cvUrl: cvAsset.url,
        coverLetter,
      });
      // Reset form
      setCoverLetter('');
      setCvAsset(null);
      onClose();
    } catch (error) {
      console.error('Application submission error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCoverLetter('');
      setCvAsset(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-swiss-charcoal">Apply for Position</h2>
            <p className="text-sm text-gray-600 mt-1">{job.title} at {job.foundationName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label={t('common:buttons.close')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* CV Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CV / Resume <span className="text-red-500">*</span>
            </label>
            {cvAsset ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="w-6 h-6 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cvAsset.filename}</p>
                    <p className="text-xs text-gray-500">Uploaded successfully</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCvAsset(null)}
                  disabled={isSubmitting}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <FileUploadZone
                label="Upload your CV/Resume"
                acceptedMimeTypes=".pdf,.doc,.docx"
                maxFileSizeMB={5}
                assetKind="CV"
                onUploadSuccess={handleCvUpload}
                autoUpload={true}
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              Accepted formats: PDF, DOC, DOCX (Max 5MB)
            </p>
          </div>

          {/* Cover Letter */}
          <div>
            <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="coverLetter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              placeholder={t('recruitment:application.coverLetterPlaceholder')}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {coverLetter.length} / 2000 characters
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="light"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('common:buttons.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!cvAsset || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobApplicationModal;

