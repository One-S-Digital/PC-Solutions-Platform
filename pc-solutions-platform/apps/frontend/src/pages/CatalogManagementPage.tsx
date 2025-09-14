import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { SwissCard, SwissButton, Input, Badge, Alert } from '@repo/ui';
import { useTranslation } from 'react-i18next';

interface Catalog {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  uploadedAt: string;
  pdfAsset?: {
    id: string;
    filename: string;
    publicUrl: string;
  };
  csvAsset?: {
    id: string;
    filename: string;
    publicUrl: string;
  };
  supplier: {
    id: string;
    name: string;
  };
}

interface CatalogFormData {
  title: string;
  description: string;
  isActive: boolean;
}

export function CatalogManagementPage() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>({
    title: '',
    description: '',
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    pdf?: File;
    csv?: File;
  }>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      const response = await fetch('/api/marketplace/catalogs', {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        },
      });
      const data = await response.json();
      setCatalogs(data);
    } catch (error) {
      console.error('Error loading catalogs:', error);
      setAlert({ type: 'error', message: 'Failed to load catalogs' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const catalogData = {
        title: formData.title,
        description: formData.description,
        isActive: formData.isActive,
      };

      let catalog;
      if (editingCatalog) {
        const response = await fetch(`/api/marketplace/catalogs/${editingCatalog.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getToken()}`,
          },
          body: JSON.stringify(catalogData),
        });
        catalog = await response.json();
      } else {
        const response = await fetch('/api/marketplace/catalogs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getToken()}`,
          },
          body: JSON.stringify(catalogData),
        });
        catalog = await response.json();
      }

      // Upload files if selected
      if (selectedFiles.pdf || selectedFiles.csv) {
        const uploadPromises = [];
        
        if (selectedFiles.pdf) {
          const pdfFormData = new FormData();
          pdfFormData.append('file', selectedFiles.pdf);
          pdfFormData.append('assetKind', 'CATALOG_PDF');
          
          uploadPromises.push(
            fetch('/api/upload/file', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${await user?.getToken()}`,
              },
              body: pdfFormData,
            }).then(response => response.json())
          );
        }
        
        if (selectedFiles.csv) {
          const csvFormData = new FormData();
          csvFormData.append('file', selectedFiles.csv);
          csvFormData.append('assetKind', 'CATALOG_CSV');
          
          uploadPromises.push(
            fetch('/api/upload/file', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${await user?.getToken()}`,
              },
              body: csvFormData,
            }).then(response => response.json())
          );
        }

        const uploadResults = await Promise.all(uploadPromises);
        
        // Associate assets with catalog
        const assetIds = {
          pdfAssetId: selectedFiles.pdf ? uploadResults[0]?.asset?.id : undefined,
          csvAssetId: selectedFiles.csv ? uploadResults[selectedFiles.pdf ? 1 : 0]?.asset?.id : undefined,
        };
        
        await fetch(`/api/marketplace/catalogs/${catalog.id}/assets`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getToken()}`,
          },
          body: JSON.stringify(assetIds),
        });
      }

      setAlert({ type: 'success', message: editingCatalog ? 'Catalog updated successfully' : 'Catalog created successfully' });
      setShowForm(false);
      setEditingCatalog(null);
      setFormData({ title: '', description: '', isActive: true });
      setSelectedFiles({});
      loadCatalogs();
    } catch (error) {
      console.error('Error saving catalog:', error);
      setAlert({ type: 'error', message: 'Failed to save catalog' });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (catalog: Catalog) => {
    setEditingCatalog(catalog);
    setFormData({
      title: catalog.title,
      description: catalog.description || '',
      isActive: catalog.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (catalogId: string) => {
    if (!confirm('Are you sure you want to delete this catalog?')) return;

    try {
      await fetch(`/api/marketplace/catalogs/${catalogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        },
      });
      setAlert({ type: 'success', message: 'Catalog deleted successfully' });
      loadCatalogs();
    } catch (error) {
      console.error('Error deleting catalog:', error);
      setAlert({ type: 'error', message: 'Failed to delete catalog' });
    }
  };

  const handleProcessCsv = async (catalogId: string, csvAssetId: string) => {
    try {
      const response = await fetch(`/api/marketplace/catalogs/${catalogId}/process-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getToken()}`,
        },
        body: JSON.stringify({ csvAssetId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAlert({ 
          type: 'success', 
          message: `CSV processed successfully: ${result.createdProducts} products created` 
        });
      } else {
        setAlert({ 
          type: 'error', 
          message: `CSV processing failed: ${result.errors.join(', ')}` 
        });
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      setAlert({ type: 'error', message: 'Failed to process CSV' });
    }
  };

  const downloadCsvTemplate = async () => {
    try {
      const response = await fetch('/api/marketplace/catalogs/csv-template', {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        },
      });
      const data = await response.json();
      
      const blob = new Blob([data.template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalog-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      setAlert({ type: 'error', message: 'Failed to download template' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-default mb-2">
            {t('catalog.title', 'Catalog Management')}
          </h1>
          <p className="text-text-secondary">
            {t('catalog.subtitle', 'Manage your product catalogs and upload CSV files')}
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            type={alert.type}
            onClose={() => setAlert(null)}
            className="mb-6"
          >
            {alert.message}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <SwissButton
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            {t('catalog.create', 'Create Catalog')}
          </SwissButton>
          
          <SwissButton
            variant="outline"
            onClick={downloadCsvTemplate}
          >
            {t('catalog.downloadTemplate', 'Download CSV Template')}
          </SwissButton>
        </div>

        {/* Form */}
        {showForm && (
          <SwissCard className="mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingCatalog ? t('catalog.edit', 'Edit Catalog') : t('catalog.create', 'Create Catalog')}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-default mb-2">
                  {t('catalog.title', 'Title')}
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('catalog.titlePlaceholder', 'Enter catalog title')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-default mb-2">
                  {t('catalog.description', 'Description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('catalog.descriptionPlaceholder', 'Enter catalog description')}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  {t('catalog.active', 'Active')}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-default mb-2">
                    {t('catalog.pdfFile', 'PDF Catalog')}
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFiles({ ...selectedFiles, pdf: e.target.files?.[0] })}
                    className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-default mb-2">
                    {t('catalog.csvFile', 'CSV Catalog')}
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setSelectedFiles({ ...selectedFiles, csv: e.target.files?.[0] })}
                    className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <SwissButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCatalog(null);
                    setFormData({ title: '', description: '', isActive: true });
                    setSelectedFiles({});
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </SwissButton>
                
                <SwissButton
                  type="submit"
                  variant="primary"
                  disabled={uploading}
                >
                  {uploading ? t('common.saving', 'Saving...') : (editingCatalog ? t('common.update', 'Update') : t('common.create', 'Create'))}
                </SwissButton>
              </div>
            </form>
          </SwissCard>
        )}

        {/* Catalogs List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SwissCard key={i} className="animate-pulse">
                <div className="h-4 bg-surface-2 rounded mb-2"></div>
                <div className="h-3 bg-surface-2 rounded mb-4"></div>
                <div className="h-8 bg-surface-2 rounded"></div>
              </SwissCard>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogs.map(catalog => (
              <SwissCard key={catalog.id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-text-default">
                    {catalog.title}
                  </h3>
                  <Badge variant={catalog.isActive ? 'success' : 'secondary'}>
                    {catalog.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                  </Badge>
                </div>

                {catalog.description && (
                  <p className="text-text-secondary text-sm mb-4">
                    {catalog.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {catalog.pdfAsset && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        PDF: {catalog.pdfAsset.filename}
                      </span>
                      <a
                        href={catalog.pdfAsset.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        {t('catalog.view', 'View')}
                      </a>
                    </div>
                  )}

                  {catalog.csvAsset && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        CSV: {catalog.csvAsset.filename}
                      </span>
                      <SwissButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleProcessCsv(catalog.id, catalog.csvAsset!.id)}
                      >
                        {t('catalog.process', 'Process')}
                      </SwissButton>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <SwissButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(catalog)}
                  >
                    {t('common.edit', 'Edit')}
                  </SwissButton>
                  
                  <SwissButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(catalog.id)}
                  >
                    {t('common.delete', 'Delete')}
                  </SwissButton>
                </div>
              </SwissCard>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && catalogs.length === 0 && (
          <SwissCard className="text-center py-12">
            <div className="text-text-secondary mb-4">
              {t('catalog.noCatalogs', 'No catalogs found. Create your first catalog to get started.')}
            </div>
            <SwissButton
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              {t('catalog.createFirst', 'Create First Catalog')}
            </SwissButton>
          </SwissCard>
        )}
      </div>
    </div>
  );
}