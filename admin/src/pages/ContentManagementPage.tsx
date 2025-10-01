import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Select, Badge } from '@repo/ui';
import { 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Folder,
  Image,
  Video,
  Music,
  Archive,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags: string[];
  status: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ContentCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
}

interface ContentDashboard {
  totalItems: number;
  publishedItems: number;
  draftItems: number;
  archivedItems: number;
  categories: number;
  recentItems: ContentItem[];
  categoryStats: Array<{
    category: string;
    _count: { category: number };
  }>;
}

const ContentManagementPage: React.FC = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [dashboard, setDashboard] = useState<ContentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    contentType: '',
    category: '',
    tags: [] as string[],
    isPublic: false,
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    parentId: '',
    sortOrder: 0,
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchDashboard();
  }, [searchTerm, selectedCategory, selectedStatus]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      
      const response = await fetch(`/api/content-management/items?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load content items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/content-management/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/content-management/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboard(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load dashboard');
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', newItem.title);
      formData.append('description', newItem.description);
      formData.append('contentType', newItem.contentType);
      formData.append('category', newItem.category);
      formData.append('tags', JSON.stringify(newItem.tags));
      formData.append('isPublic', newItem.isPublic.toString());
      formData.append('uploadedBy', 'admin'); // This should come from auth context

      const response = await fetch('/api/content-management/items', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Content uploaded successfully');
        setIsUploadDialogOpen(false);
        setNewItem({
          title: '',
          description: '',
          contentType: '',
          category: '',
          tags: [],
          isPublic: false,
        });
        fetchItems();
        fetchDashboard();
      } else {
        throw new Error(data.message || 'Failed to upload content');
      }
    } catch (error) {
      console.error('Failed to upload content:', error);
      toast.error('Failed to upload content');
    }
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/content-management/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Category created successfully');
        setIsCategoryDialogOpen(false);
        setNewCategory({
          name: '',
          description: '',
          parentId: '',
          sortOrder: 0,
        });
        fetchCategories();
      } else {
        throw new Error(data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    }
  };

  const handlePublish = async (itemId: string) => {
    try {
      const response = await fetch(`/api/content-management/items/${itemId}/publish`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Content published successfully');
        fetchItems();
        fetchDashboard();
      } else {
        throw new Error(data.message || 'Failed to publish content');
      }
    } catch (error) {
      console.error('Failed to publish content:', error);
      toast.error('Failed to publish content');
    }
  };

  const handleArchive = async (itemId: string) => {
    try {
      const response = await fetch(`/api/content-management/items/${itemId}/archive`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Content archived successfully');
        fetchItems();
        fetchDashboard();
      } else {
        throw new Error(data.message || 'Failed to archive content');
      }
    } catch (error) {
      console.error('Failed to archive content:', error);
      toast.error('Failed to archive content');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return;

    try {
      const response = await fetch(`/api/content-management/items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Content deleted successfully');
        fetchItems();
        fetchDashboard();
      } else {
        throw new Error(data.message || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast.error('Failed to delete content');
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return <Archive className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'info';
      default:
        return 'info';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const tabs = [
    { id: 'items', label: 'Content Items' },
    { id: 'categories', label: 'Categories' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Manage and organize platform content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <Folder className="h-4 w-4 mr-2" />
            New Category
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{dashboard.totalItems}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{dashboard.publishedItems}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">{dashboard.draftItems}</p>
              </div>
              <Edit className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{dashboard.categories}</p>
              </div>
              <Folder className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-swiss-mint text-swiss-mint'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'items' && (
          <>
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map((category) => ({
                      value: category.name,
                      label: category.name,
                    })),
                  ]}
                />
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </div>
            </Card>

            {/* Content Items */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Content Items</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getContentIcon(item.contentType)}
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          {item.category && (
                            <Badge variant="info">{item.category}</Badge>
                          )}
                          {item.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(item.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(item.id)}
                        >
                          Publish
                        </Button>
                      )}
                      {item.status === 'published' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(item.id)}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No content items found
                  </p>
                )}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'categories' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Content Categories</h2>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={category.isActive ? 'success' : 'info'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Order: {category.sortOrder}
                    </span>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No categories found
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      {isUploadDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Upload New Content</h2>
            <div className="space-y-4">
              <Input
                label="Title"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                label="Description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              />
              <Select
                label="Content Type"
                value={newItem.contentType}
                onChange={(e) => setNewItem(prev => ({ ...prev, contentType: e.target.value }))}
                options={[
                  { value: '', label: 'Select content type' },
                  { value: 'document', label: 'Document' },
                  { value: 'image', label: 'Image' },
                  { value: 'video', label: 'Video' },
                  { value: 'audio', label: 'Audio' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select
                label="Category"
                value={newItem.category}
                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                options={[
                  { value: '', label: 'Select category' },
                  ...categories.map((category) => ({
                    value: category.name,
                    label: category.name,
                  })),
                ]}
              />
              <Input
                label="File"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUpload(file);
                  }
                }}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setIsUploadDialogOpen(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Dialog */}
      {isCategoryDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Category</h2>
            <div className="space-y-4">
              <Input
                label="Category Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                label="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
              />
              <Input
                label="Sort Order"
                type="number"
                value={newCategory.sortOrder}
                onChange={(e) => setNewCategory(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setIsCategoryDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagementPage;