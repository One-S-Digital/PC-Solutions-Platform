import React, { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useServices } from '../hooks/useServices'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const MarketplacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { products, isLoading: productsLoading, error: productsError } = useProducts({
    search: searchQuery || undefined,
    limit: 20
  })
  
  const { services, isLoading: servicesLoading, error: servicesError } = useServices({
    search: searchQuery || undefined,
    limit: 20
  })

  const isLoading = productsLoading || servicesLoading
  const error = productsError || servicesError

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          Marketplace
        </h1>
        <p className="text-gray-600">
          Discover products and services for your daycare.
        </p>
      </div>

      {/* Search and Tabs */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products and services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-swiss-charcoal shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'services'
                  ? 'bg-white text-swiss-charcoal shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Services
            </button>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}
        
        {error && (
          <div className="text-red-600 text-center py-8">
            Failed to load marketplace data. Please try again.
          </div>
        )}

        {!isLoading && !error && (
          <>
            {activeTab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No products found. Try adjusting your search.
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="card p-4 card-hover">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="font-semibold text-lg mb-2">{product.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">{product.supplierName}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.stockStatusColor === 'green' ? 'bg-green-100 text-green-800' :
                          product.stockStatusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          product.stockStatusColor === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {product.stockStatusLabel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-swiss-mint">{product.formattedPrice}</span>
                        <button className="btn btn-primary text-sm">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'services' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No services found. Try adjusting your search.
                  </div>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="card p-4 card-hover">
                      {service.imageUrl && (
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">{service.providerName}</span>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {service.categoryLabel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{service.deliveryTypeLabel}</span>
                        <button className="btn btn-primary text-sm">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MarketplacePage