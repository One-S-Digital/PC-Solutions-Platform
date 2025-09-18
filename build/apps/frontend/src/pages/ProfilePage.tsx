import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Badge } from '@repo/ui';
import { UserIcon, CameraIcon, PencilIcon, TrashIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useUserProfile, UserRole, ProfileUpdateData } from '../services/userProfileService';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { 
    profile, 
    loading, 
    error, 
    updateProfile, 
    uploadAvatar, 
    deleteAccount, 
    updateRole 
  } = useUserProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<ProfileUpdateData>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        organization: profile.organization,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        socialLinks: profile.socialLinks,
        preferences: profile.preferences,
      });
    }
  }, [profile]);

  const handleInputChange = (field: keyof ProfileUpdateData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handlePreferenceChange = (preference: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setIsSaving(true);
      
      // Upload avatar if changed
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }
      
      // Update profile data
      await updateProfile(formData);
      
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        organization: profile.organization,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        socialLinks: profile.socialLinks,
        preferences: profile.preferences,
      });
    }
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (err: any) {
      console.error('Error deleting account:', err);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.FOUNDATION: return 'mint';
      case UserRole.EDUCATOR: return 'teal';
      case UserRole.PRODUCT_SUPPLIER: return 'coral';
      case UserRole.SERVICE_PROVIDER: return 'sand';
      case UserRole.PARENT: return 'mint';
      case UserRole.ADMIN: return 'coral';
      case UserRole.SUPER_ADMIN: return 'coral';
      default: return 'mint';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.FOUNDATION: return 'Foundation (Daycare)';
      case UserRole.EDUCATOR: return 'Educator';
      case UserRole.PRODUCT_SUPPLIER: return 'Product Supplier';
      case UserRole.SERVICE_PROVIDER: return 'Service Provider';
      case UserRole.PARENT: return 'Parent';
      case UserRole.ADMIN: return 'Administrator';
      case UserRole.SUPER_ADMIN: return 'Super Administrator';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen frontend-page bg-swiss-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
              <p className="text-swiss-gray">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen frontend-page bg-swiss-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="flex items-center text-red-600 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3" />
              <h2 className="text-xl font-semibold">Error Loading Profile</h2>
            </div>
            <p className="text-swiss-gray mb-4">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen frontend-page bg-swiss-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="text-center">
              <UserIcon className="h-12 w-12 text-swiss-gray mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">No Profile Found</h2>
              <p className="text-swiss-gray">Unable to load your profile information.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page bg-swiss-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="h-1 w-16 bg-swiss-mint rounded-full mr-4"></div>
            <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
              Profile Settings
            </h1>
          </div>
          <p className="text-swiss-gray font-medium">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-swiss-light border-4 border-swiss-mint">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : profile.avatar ? (
                      <img src={profile.avatar} alt="Profile avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UserIcon className="h-12 w-12 text-swiss-mint" />
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-swiss-mint text-white rounded-full p-2 cursor-pointer hover:bg-swiss-mint-dark transition-colors">
                      <CameraIcon className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-swiss-gray mb-3">{profile.email}</p>
                
                <Badge variant={getRoleColor(profile.role) as any} className="mb-4">
                  {getRoleDisplayName(profile.role)}
                </Badge>

                {profile.bio && (
                  <p className="text-sm text-swiss-gray mb-4">{profile.bio}</p>
                )}

                <div className="flex justify-center space-x-2">
                  {!isEditing ? (
                    <Button
                      variant="primary"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <PencilIcon className="h-4 w-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex items-center"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Account Actions */}
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold text-swiss-charcoal mb-4">Account Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {/* TODO: Implement change password */}}
                >
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-swiss-charcoal mb-6">Profile Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    First Name
                  </label>
                  <Input
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    Last Name
                  </label>
                  <Input
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    Phone Number
                  </label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    Organization
                  </label>
                  <Input
                    value={formData.organization || ''}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your organization"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    Location
                  </label>
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                    Website
                  </label>
                  <Input
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your website URL"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Social Links */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-swiss-charcoal mb-4">Social Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                      LinkedIn
                    </label>
                    <Input
                      value={formData.socialLinks?.linkedin || ''}
                      onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                      disabled={!isEditing}
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                      Twitter
                    </label>
                    <Input
                      value={formData.socialLinks?.twitter || ''}
                      onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Twitter profile URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
                      Facebook
                    </label>
                    <Input
                      value={formData.socialLinks?.facebook || ''}
                      onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Facebook profile URL"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-swiss-charcoal mb-4">Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-swiss-charcoal">Email Notifications</label>
                      <p className="text-xs text-swiss-gray">Receive email updates about your account</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.preferences?.emailUpdates || false}
                      onChange={(e) => handlePreferenceChange('emailUpdates', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-swiss-charcoal">SMS Notifications</label>
                      <p className="text-xs text-swiss-gray">Receive SMS updates about important events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.preferences?.smsUpdates || false}
                      onChange={(e) => handlePreferenceChange('smsUpdates', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md mx-4">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">Delete Account</h3>
                <p className="text-swiss-gray mb-6">
                  Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}