import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Package,
  Calendar,
  DollarSign,
  Building2,
  User,
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { Order, LineItem } from '../types/api'

const Orders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const apiClient = useApiClient()

  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiService.getOrders(apiClient),
  })

  const orders: Order[] = (ordersResponse?.data?.data || []).map((order: Order) => {
    const items = order.items || []
    const itemCount = items.reduce(
      (sum: number, item: LineItem) => sum + (item.quantity || 0),
      0
    )
    const itemsPreview = items
      .slice(0, 2)
      .map((item: LineItem) => `${item.productName} (${item.quantity})`)
      .join(', ')
    return { ...order, itemCount, itemsPreview }
  })

  const filteredOrders = orders.filter((order: Order) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch =
      order.id?.toLowerCase()?.includes(search) ||
      order.supplierName?.toLowerCase()?.includes(search) ||
      order.foundation?.name?.toLowerCase()?.includes(search) ||
      order.foundationOrg?.name?.toLowerCase()?.includes(search)
    const matchesStatus = !selectedStatus || order.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, string> = {
    Submitted: 'bg-swiss-coral/20 text-swiss-coral',
    ViewedBySupplier: 'bg-blue-100 text-blue-800',
    Accepted: 'bg-swiss-mint/20 text-swiss-mint',
    Processing: 'bg-swiss-sand/30 text-amber-700',
    Shipped: 'bg-swiss-teal/20 text-swiss-teal',
    Fulfilled: 'bg-swiss-mint text-white',
    Cancelled: 'bg-red-100 text-red-700',
    Declined: 'bg-red-100 text-red-700',
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
        <div className="text-red-500 mb-4">Failed to load orders</div>
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
            <ShoppingCart className="h-8 w-8 mr-3 text-swiss-teal" />
            Orders
          </h1>
          <p className="mt-2 text-gray-600">
            Manage customer orders and deliveries ({orders.length} total)
          </p>
        </div>
        <button className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create Order
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
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Submitted">Submitted</option>
              <option value="ViewedBySupplier">Viewed By Supplier</option>
              <option value="Accepted">Accepted</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-swiss-teal/10 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-swiss-teal" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">#{order.id.substring(0,8)}</div>
                          <div className="text-sm text-gray-500">{order.supplierName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {order.foundation?.name || 'N/A'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {order.foundationOrg?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.itemCount} items</div>
                      <div className="text-sm text-gray-500">{order.itemsPreview}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(order.totalAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(order.requestDate).toLocaleDateString()}
                      </div>
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
                                    Edit Order
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel Order
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
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or create a new order.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders
