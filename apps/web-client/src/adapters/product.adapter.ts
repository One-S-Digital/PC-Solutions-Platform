// Product data adapter for transforming API responses to UI models
export interface ApiProduct {
  id: string
  title: string
  supplierId: string
  supplierName: string
  supplierLogo?: string
  description: string
  category: string
  tags: string[]
  imageUrl?: string
  price?: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand'
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface UIProduct {
  id: string
  title: string
  supplierId: string
  supplierName: string
  supplierLogo?: string
  description: string
  category: string
  tags: string[]
  imageUrl?: string
  price?: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand'
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
  formattedPrice: string
  stockStatusColor: string
  stockStatusLabel: string
  statusLabel: string
  formattedCreatedAt: string
}

export const productAdapter = {
  toUI: (apiProduct: ApiProduct): UIProduct => ({
    ...apiProduct,
    formattedPrice: apiProduct.price ? `CHF ${apiProduct.price.toFixed(2)}` : 'Price on request',
    stockStatusColor: apiProduct.stockStatus === 'In Stock' ? 'green' : 
                     apiProduct.stockStatus === 'Low Stock' ? 'yellow' : 
                     apiProduct.stockStatus === 'Out of Stock' ? 'red' : 'blue',
    stockStatusLabel: apiProduct.stockStatus,
    statusLabel: apiProduct.status === 'active' ? 'Active' : 
                 apiProduct.status === 'inactive' ? 'Inactive' : 
                 'Pending',
    formattedCreatedAt: new Date(apiProduct.createdAt).toLocaleDateString(),
  }),
  
  toAPI: (uiProduct: Partial<UIProduct>): Partial<ApiProduct> => ({
    title: uiProduct.title,
    description: uiProduct.description,
    category: uiProduct.category,
    tags: uiProduct.tags,
    imageUrl: uiProduct.imageUrl,
    price: uiProduct.price,
    stockStatus: uiProduct.stockStatus,
    status: uiProduct.status,
  }),
}