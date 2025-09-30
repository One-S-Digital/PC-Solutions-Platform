import React, { useState } from 'react'
import { useOrganizations } from '../hooks/useOrganizations'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const RecruitmentPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  
  const { organizations, isLoading, error } = useOrganizations({
    search: searchQuery || undefined,
    limit: 20
  })

  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'assistant', label: 'Assistants' },
    { value: 'director', label: 'Directors' },
    { value: 'cook', label: 'Cooks' },
    { value: 'maintenance', label: 'Maintenance' }
  ]

  const filteredOrganizations = organizations.filter(org => 
    !selectedRole || org.availableRoles.includes(selectedRole)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          Recruitment
        </h1>
        <p className="text-gray-600">
          Find and manage talent for your daycare.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}
        
        {error && (
          <div className="text-red-600 text-center py-8">
            Failed to load recruitment data. Please try again.
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No organizations found. Try adjusting your search or filters.
              </div>
            ) : (
              filteredOrganizations.map((org) => (
                <div key={org.id} className="card p-4 card-hover">
                  {org.logoUrl && (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2">{org.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{org.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location:</span>
                      <span>{org.location}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Size:</span>
                      <span>{org.sizeLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Open Positions:</span>
                      <span className="font-semibold text-swiss-mint">{org.openPositions}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Available Roles:</div>
                    <div className="flex flex-wrap gap-1">
                      {org.availableRoles.map(role => (
                        <span
                          key={role}
                          className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn btn-primary text-sm flex-1">
                      View Details
                    </button>
                    <button className="btn btn-secondary text-sm">
                      Contact
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecruitmentPage