# API Documentation

## Overview

The PC Solutions API is built with NestJS and provides RESTful endpoints for the platform. This documentation covers authentication, endpoints, data models, and integration examples.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-api-url.onrender.com`

## Authentication

### Clerk Integration

The API uses Clerk for authentication with JWT bearer tokens.

#### Headers
```http
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
```

#### Token Validation
```typescript
// The API validates Clerk JWTs and resolves user identity
@UseGuards(AuthGuard)
@Get('profile')
async getProfile(@Request() req) {
  // req.user contains the resolved AppUser
  return req.user
}
```

### User Resolution

The API resolves Clerk user IDs to internal AppUser records:

```typescript
// GET /users/me
{
  "id": "app_user_123",
  "clerkId": "clerk_user_456",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "FOUNDATION",
  "organization": {
    "id": "org_123",
    "name": "Sunshine Daycare",
    "type": "FOUNDATION"
  }
}
```

## Endpoints

### Authentication

#### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "app_user_123",
  "clerkId": "clerk_user_456",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "FOUNDATION",
  "organization": {
    "id": "org_123",
    "name": "Sunshine Daycare",
    "type": "FOUNDATION",
    "location": "New York, NY",
    "size": 50
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Organizations

#### List Organizations
```http
GET /organizations?page=1&limit=10&type=FOUNDATION&search=daycare
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `type` (string): Organization type filter
- `search` (string): Search query
- `region` (string): Region filter
- `status` (string): Status filter

**Response:**
```json
{
  "data": [
    {
      "id": "org_123",
      "name": "Sunshine Daycare",
      "type": "FOUNDATION",
      "location": "New York, NY",
      "size": 50,
      "openPositions": 3,
      "availableRoles": ["teacher", "assistant"],
      "logoUrl": "https://example.com/logo.jpg",
      "description": "A caring daycare center...",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

#### Get Organization
```http
GET /organizations/:id
```

**Response:**
```json
{
  "id": "org_123",
  "name": "Sunshine Daycare",
  "type": "FOUNDATION",
  "location": "New York, NY",
  "size": 50,
  "openPositions": 3,
  "availableRoles": ["teacher", "assistant"],
  "logoUrl": "https://example.com/logo.jpg",
  "description": "A caring daycare center...",
  "contactInfo": {
    "email": "info@sunshinedaycare.com",
    "phone": "+1-555-0123",
    "website": "https://sunshinedaycare.com"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Products

#### List Products
```http
GET /products?page=1&limit=10&category=toys&search=educational
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `category` (string): Product category
- `search` (string): Search query
- `supplierId` (string): Supplier filter
- `status` (string): Status filter

**Response:**
```json
{
  "data": [
    {
      "id": "prod_123",
      "title": "Educational Building Blocks",
      "description": "Colorful blocks for learning...",
      "price": 29.99,
      "currency": "USD",
      "supplierId": "supplier_456",
      "supplierName": "EduToys Inc.",
      "stockStatus": "in_stock",
      "imageUrl": "https://example.com/blocks.jpg",
      "category": "toys",
      "tags": ["educational", "blocks", "learning"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

#### Get Product
```http
GET /products/:id
```

**Response:**
```json
{
  "id": "prod_123",
  "title": "Educational Building Blocks",
  "description": "Colorful blocks for learning...",
  "price": 29.99,
  "currency": "USD",
  "supplierId": "supplier_456",
  "supplierName": "EduToys Inc.",
  "stockStatus": "in_stock",
  "imageUrl": "https://example.com/blocks.jpg",
  "category": "toys",
  "tags": ["educational", "blocks", "learning"],
  "specifications": {
    "ageRange": "3-6 years",
    "material": "wood",
    "dimensions": "10x10x5 cm"
  },
  "reviews": [
    {
      "id": "review_123",
      "rating": 5,
      "comment": "Great quality blocks!",
      "userName": "Sarah M.",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Services

#### List Services
```http
GET /services?page=1&limit=10&category=cleaning&search=deep
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `category` (string): Service category
- `search` (string): Search query
- `providerId` (string): Provider filter
- `status` (string): Status filter

**Response:**
```json
{
  "data": [
    {
      "id": "service_123",
      "title": "Deep Cleaning Service",
      "description": "Professional deep cleaning...",
      "price": 150.00,
      "currency": "USD",
      "providerId": "provider_456",
      "providerName": "CleanPro Solutions",
      "category": "cleaning",
      "deliveryType": "on_site",
      "imageUrl": "https://example.com/cleaning.jpg",
      "tags": ["cleaning", "deep", "professional"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### Messages

#### List Conversations
```http
GET /conversations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "conv_123",
      "participants": [
        {
          "id": "user_123",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "FOUNDATION"
        },
        {
          "id": "user_456",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "role": "EDUCATOR"
        }
      ],
      "lastMessage": {
        "id": "msg_789",
        "content": "Thank you for the update!",
        "senderId": "user_456",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      "unreadCount": 2,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Conversation Messages
```http
GET /conversations/:id/messages?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "msg_123",
      "content": "Hello! How are you?",
      "senderId": "user_123",
      "senderName": "John Doe",
      "timestamp": "2024-01-15T10:30:00Z",
      "read": true
    },
    {
      "id": "msg_124",
      "content": "I'm doing well, thank you!",
      "senderId": "user_456",
      "senderName": "Jane Smith",
      "timestamp": "2024-01-15T10:35:00Z",
      "read": false
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

#### Send Message
```http
POST /conversations/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello! How are you?"
}
```

**Response:**
```json
{
  "id": "msg_125",
  "content": "Hello! How are you?",
  "senderId": "user_123",
  "senderName": "John Doe",
  "timestamp": "2024-01-15T10:40:00Z",
  "read": false
}
```

### File Upload

#### Upload File
```http
POST /uploads
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
type: "image" | "document" | "video"
```

**Response:**
```json
{
  "id": "file_123",
  "filename": "document.pdf",
  "originalName": "my-document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "url": "https://storage.example.com/files/file_123.pdf",
  "type": "document",
  "uploadedBy": "user_123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Admin Endpoints

#### System Health
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "responseTime": 5
  }
}
```

#### Get System Metrics
```http
GET /admin/metrics
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "users": {
    "total": 1250,
    "active": 1100,
    "newThisMonth": 50
  },
  "organizations": {
    "total": 85,
    "active": 80,
    "newThisMonth": 5
  },
  "products": {
    "total": 500,
    "active": 450,
    "newThisMonth": 25
  },
  "services": {
    "total": 200,
    "active": 180,
    "newThisMonth": 10
  },
  "revenue": {
    "thisMonth": 15000,
    "lastMonth": 12000,
    "growth": 25
  }
}
```

## Data Models

### User Model
```typescript
interface AppUser {
  id: string
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId?: string
  organization?: Organization
  createdAt: Date
  updatedAt: Date
}

enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT'
}
```

### Organization Model
```typescript
interface Organization {
  id: string
  name: string
  type: OrganizationType
  location: string
  size: number
  openPositions: number
  availableRoles: string[]
  logoUrl?: string
  description?: string
  contactInfo?: ContactInfo
  createdAt: Date
  updatedAt: Date
}

enum OrganizationType {
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER'
}

interface ContactInfo {
  email?: string
  phone?: string
  website?: string
  address?: string
}
```

### Product Model
```typescript
interface Product {
  id: string
  title: string
  description: string
  price: number
  currency: string
  supplierId: string
  supplierName: string
  stockStatus: StockStatus
  imageUrl?: string
  category: string
  tags: string[]
  specifications?: Record<string, any>
  reviews?: Review[]
  createdAt: Date
  updatedAt: Date
}

enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

interface Review {
  id: string
  rating: number
  comment: string
  userName: string
  createdAt: Date
}
```

### Service Model
```typescript
interface Service {
  id: string
  title: string
  description: string
  price: number
  currency: string
  providerId: string
  providerName: string
  category: string
  deliveryType: DeliveryType
  imageUrl?: string
  tags: string[]
  specifications?: Record<string, any>
  reviews?: Review[]
  createdAt: Date
  updatedAt: Date
}

enum DeliveryType {
  ON_SITE = 'on_site',
  REMOTE = 'remote',
  HYBRID = 'hybrid'
}
```

## Error Handling

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/users"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic errors)
- `500` - Internal Server Error (server errors)

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **File upload endpoints**: 20 requests per minute
- **Admin endpoints**: 50 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Pagination

Most list endpoints support pagination:

### Query Parameters
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)

### Response Format
```json
{
  "data": [...],
  "total": 250,
  "page": 1,
  "limit": 10,
  "totalPages": 25,
  "hasNext": true,
  "hasPrev": false
}
```

## Filtering and Searching

### Search Parameters
- `search` (string): Full-text search across relevant fields
- `sort` (string): Sort field (e.g., "name", "-createdAt")
- `order` (string): Sort order ("asc" or "desc")

### Filter Examples
```http
# Search for organizations with "daycare" in name
GET /organizations?search=daycare

# Filter products by category and sort by price
GET /products?category=toys&sort=price&order=asc

# Filter services by delivery type
GET /services?deliveryType=on_site
```

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `user.created` - New user registered
- `user.updated` - User profile updated
- `organization.created` - New organization created
- `product.created` - New product added
- `service.created` - New service added
- `message.sent` - New message sent

### Webhook Payload
```json
{
  "event": "user.created",
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "FOUNDATION"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## SDK and Client Libraries

### JavaScript/TypeScript
```typescript
import { PCSolutionsAPI } from '@pc-solutions/api-client'

const api = new PCSolutionsAPI({
  baseURL: 'https://api.pc-solutions.com',
  token: 'your_clerk_jwt_token'
})

// Get current user
const user = await api.users.getMe()

// List organizations
const organizations = await api.organizations.list({
  page: 1,
  limit: 10,
  type: 'FOUNDATION'
})

// Send message
const message = await api.messages.send('conv_123', {
  content: 'Hello!'
})
```

### Python
```python
from pc_solutions_api import PCSolutionsAPI

api = PCSolutionsAPI(
    base_url='https://api.pc-solutions.com',
    token='your_clerk_jwt_token'
)

# Get current user
user = api.users.get_me()

# List organizations
organizations = api.organizations.list(
    page=1,
    limit=10,
    type='FOUNDATION'
)
```

## Testing

### API Testing
```bash
# Install testing tools
npm install -g newman

# Run API tests
newman run api-tests.postman_collection.json \
  --environment production.postman_environment.json
```

### Integration Testing
```typescript
// Example integration test
describe('Organizations API', () => {
  it('should list organizations', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations')
      .expect(200)

    expect(response.body.data).toBeInstanceOf(Array)
    expect(response.body.total).toBeGreaterThan(0)
  })
})
```

## Conclusion

This API documentation provides comprehensive information about the PC Solutions API, including:

- **Authentication** - Clerk JWT integration
- **Endpoints** - Complete endpoint reference
- **Data Models** - TypeScript interfaces
- **Error Handling** - Standardized error responses
- **Rate Limiting** - Protection against abuse
- **Pagination** - Consistent pagination format
- **Filtering** - Search and filter capabilities
- **Webhooks** - Real-time notifications
- **SDKs** - Client library examples
- **Testing** - API testing strategies

The API is designed to be RESTful, consistent, and easy to integrate with frontend applications and third-party services.