import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Building2
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'

import logger from '../utils/logger'

import { User } from '../types/api'
import { UserRole } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

const Users: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const apiClient = useApiClient()

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(apiClient),
    enabled: !!apiClient,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  })

  const users: User[] = usersResponse?.data?.data || []

  const roleColors: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-800',
    [UserRole.ADMIN]: 'bg-orange-100 text-orange-800',
    [UserRole.FOUNDATION]: 'bg-blue-100 text-blue-800',
    [UserRole.PRODUCT_SUPPLIER]: 'bg-green-100 text-green-800',
    [UserRole.SERVICE_PROVIDER]: 'bg-purple-100 text-purple-800',
    [UserRole.EDUCATOR]: 'bg-indigo-100 text-indigo-800',
    [UserRole.PARENT]: 'bg-pink-100 text-pink-800',
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !selectedRole || user.role === selectedRole
    return matchesSearch && matchesRole
  })


  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await apiService.updateUser(apiClient, updatedUser.id, updatedUser)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditModalOpen(false)
    } catch (error) {
      logger.error('Failed to update user:', error)
      // You might want to show an error message to the user
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Failed to load users</div>
        <p className="text-gray-600">Please check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="h-8 w-8 mr-3 text-swiss-teal" />
            Users Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage all users across the platform ({users.length} total)
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.FOUNDATION}>Foundation</option>
              <option value={UserRole.PRODUCT_SUPPLIER}>Product Supplier</option>
              <option value={UserRole.SERVICE_PROVIDER}>Service Provider</option>
              <option value={UserRole.EDUCATOR}>Educator</option>
              <option value={UserRole.PARENT}>Parent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.avatarUrl ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-swiss-teal flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {user.orgName ? (
                        <>
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          {user.orgName}
                        </>
                      ) : (
                        <span className="text-gray-400">No organization</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or add a new user.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users
