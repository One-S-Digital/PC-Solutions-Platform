# Subscription Plans Guide

## Overview

The PC Solutions platform offers tiered subscription plans for different user types and organization sizes. This guide covers the implementation, configuration, and management of subscription plans.

## Plan Structure

### Plan Tiers

#### 1. Foundation Plans
**Target**: Daycare centers, preschools, and educational institutions

| Plan | Price | Features | Limits |
|------|-------|----------|--------|
| **Starter** | $29/month | Basic dashboard, 50 children, 5 staff | 1 location |
| **Professional** | $79/month | Advanced features, 200 children, 20 staff | 3 locations |
| **Enterprise** | $199/month | Full features, unlimited children/staff | Unlimited locations |

#### 2. Supplier Plans
**Target**: Product suppliers and vendors

| Plan | Price | Features | Limits |
|------|-------|----------|--------|
| **Basic** | $49/month | Product listings, basic analytics | 100 products |
| **Premium** | $149/month | Advanced analytics, marketing tools | 500 products |
| **Enterprise** | $399/month | Full marketplace features | Unlimited products |

#### 3. Service Provider Plans
**Target**: Service providers (cleaning, maintenance, etc.)

| Plan | Price | Features | Limits |
|------|-------|----------|--------|
| **Basic** | $39/month | Service listings, basic booking | 50 services |
| **Premium** | $119/month | Advanced booking, analytics | 200 services |
| **Enterprise** | $299/month | Full service management | Unlimited services |

#### 4. Educator Plans
**Target**: Individual educators and teachers

| Plan | Price | Features | Limits |
|------|-------|----------|--------|
| **Free** | $0/month | Basic profile, job applications | 5 applications/month |
| **Professional** | $19/month | Enhanced profile, unlimited applications | Priority placement |

#### 5. Parent Plans
**Target**: Parents seeking daycare services

| Plan | Price | Features | Limits |
|------|-------|----------|--------|
| **Free** | $0/month | Basic search, 3 inquiries/month | Limited features |
| **Premium** | $9/month | Advanced search, unlimited inquiries | Priority support |

## Implementation

### Frontend Implementation

#### Pricing Page (`apps/web-client/src/pages/PricingPage.tsx`)
```typescript
interface PricingPlan {
  id: string
  name: string
  price: number
  currency: string
  period: 'monthly' | 'yearly'
  features: string[]
  limits: Record<string, number>
  popular?: boolean
  cta: string
}

const plans: PricingPlan[] = [
  {
    id: 'foundation-starter',
    name: 'Starter',
    price: 29,
    currency: 'USD',
    period: 'monthly',
    features: [
      'Basic dashboard',
      '50 children capacity',
      '5 staff members',
      '1 location',
      'Email support'
    ],
    limits: {
      children: 50,
      staff: 5,
      locations: 1
    },
    cta: 'Start Free Trial'
  },
  // ... more plans
]
```

#### Plan Selection Component
```typescript
const PlanCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => {
  return (
    <div className={`card p-6 ${plan.popular ? 'ring-2 ring-swiss-mint' : ''}`}>
      {plan.popular && (
        <div className="badge badge-primary mb-4">Most Popular</div>
      )}
      
      <h3 className="text-2xl font-bold text-swiss-charcoal mb-2">
        {plan.name}
      </h3>
      
      <div className="mb-4">
        <span className="text-4xl font-bold text-swiss-mint">
          ${plan.price}
        </span>
        <span className="text-gray-600">/{plan.period}</span>
      </div>
      
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckIcon className="h-5 w-5 text-swiss-mint mr-2" />
            {feature}
          </li>
        ))}
      </ul>
      
      <button className="btn btn-primary w-full">
        {plan.cta}
      </button>
    </div>
  )
}
```

### Backend Implementation

#### Plan Model (`api/prisma/schema.prisma`)
```prisma
model SubscriptionPlan {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Decimal
  currency    String   @default("USD")
  period      String   // "monthly", "yearly"
  features    Json     // Array of features
  limits      Json     // Object with limits
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  subscriptions Subscription[]
  
  @@map("subscription_plans")
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String
  planId    String
  status    String   // "active", "cancelled", "expired"
  startDate DateTime
  endDate   DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user AppUser        @relation(fields: [userId], references: [id])
  plan SubscriptionPlan @relation(fields: [planId], references: [id])
  
  @@map("subscriptions")
}
```

#### Plan Service (`api/src/subscription/subscription.service.ts`)
```typescript
@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getPlansByUserType(userType: string): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        active: true,
        userType: userType
      },
      orderBy: {
        price: 'asc'
      }
    })
  }

  async createSubscription(
    userId: string,
    planId: string
  ): Promise<Subscription> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      throw new NotFoundException('Plan not found')
    }

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // Monthly subscription

    return this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        startDate,
        endDate
      },
      include: {
        plan: true
      }
    })
  }

  async checkUserLimits(userId: string): Promise<Record<string, number>> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active'
      },
      include: {
        plan: true
      }
    })

    if (!subscription) {
      return {} // No limits for free users
    }

    return subscription.plan.limits as Record<string, number>
  }
}
```

### API Endpoints

#### Get Plans (`api/src/subscription/subscription.controller.ts`)
```typescript
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('plans/:userType')
  async getPlans(@Param('userType') userType: string) {
    return this.subscriptionService.getPlansByUserType(userType)
  }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  async subscribe(
    @Request() req,
    @Body() body: { planId: string }
  ) {
    return this.subscriptionService.createSubscription(
      req.user.id,
      body.planId
    )
  }

  @Get('limits')
  @UseGuards(AuthGuard)
  async getLimits(@Request() req) {
    return this.subscriptionService.checkUserLimits(req.user.id)
  }
}
```

## Configuration

### Environment Variables
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Subscription Settings
DEFAULT_TRIAL_DAYS=14
GRACE_PERIOD_DAYS=3
```

### Plan Configuration
```typescript
// config/subscription-plans.ts
export const SUBSCRIPTION_PLANS = {
  FOUNDATION: {
    STARTER: {
      id: 'foundation-starter',
      name: 'Starter',
      price: 29,
      features: ['Basic dashboard', '50 children', '5 staff'],
      limits: { children: 50, staff: 5, locations: 1 }
    },
    PROFESSIONAL: {
      id: 'foundation-professional',
      name: 'Professional',
      price: 79,
      features: ['Advanced features', '200 children', '20 staff'],
      limits: { children: 200, staff: 20, locations: 3 }
    }
  },
  // ... other plan types
}
```

## Payment Integration

### Stripe Integration
```typescript
// services/stripe.service.ts
@Injectable()
export class StripeService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }

  async createCheckoutSession(
    planId: string,
    userId: string
  ): Promise<Stripe.Checkout.Session> {
    const plan = await this.getPlan(planId)
    
    return this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: plan.description
            },
            unit_amount: plan.price * 100 // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId,
        planId
      }
    })
  }

  async handleWebhook(payload: string, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleSubscriptionCreated(event.data.object)
        break
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object)
        break
      // ... other event handlers
    }
  }
}
```

## Usage Limits

### Limit Enforcement
```typescript
// guards/limit.guard.ts
@Injectable()
export class LimitGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const limits = await this.subscriptionService.checkUserLimits(user.id)
    
    // Check specific limit based on route
    const limitType = this.reflector.get('limitType', context.getHandler())
    const currentUsage = await this.getCurrentUsage(user.id, limitType)
    
    return currentUsage < limits[limitType]
  }
}

// Usage in controller
@Post('children')
@UseGuards(LimitGuard)
@SetMetadata('limitType', 'children')
async createChild(@Body() childData: CreateChildDto) {
  // Implementation
}
```

### Usage Tracking
```typescript
// services/usage.service.ts
@Injectable()
export class UsageService {
  async trackUsage(userId: string, resourceType: string, amount: number = 1) {
    await this.prisma.usageTracking.upsert({
      where: {
        userId_resourceType: {
          userId,
          resourceType
        }
      },
      update: {
        count: { increment: amount },
        lastUsed: new Date()
      },
      create: {
        userId,
        resourceType,
        count: amount,
        lastUsed: new Date()
      }
    })
  }

  async getUsage(userId: string, resourceType: string): Promise<number> {
    const usage = await this.prisma.usageTracking.findUnique({
      where: {
        userId_resourceType: {
          userId,
          resourceType
        }
      }
    })
    
    return usage?.count || 0
  }
}
```

## Admin Management

### Plan Management Interface
```typescript
// admin/src/pages/SubscriptionPlans.tsx
const SubscriptionPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <button className="btn btn-primary">Add New Plan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="card p-6">
            <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
            <p className="text-2xl font-bold text-swiss-mint mb-4">
              ${plan.price}/{plan.period}
            </p>
            <div className="space-y-2 mb-4">
              {plan.features.map((feature, index) => (
                <div key={index} className="text-sm text-gray-600">
                  • {feature}
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingPlan(plan)}
              >
                Edit
              </button>
              <button className="btn btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Testing

### Unit Tests
```typescript
// subscription.service.spec.ts
describe('SubscriptionService', () => {
  let service: SubscriptionService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService, PrismaService]
    }).compile()

    service = module.get<SubscriptionService>(SubscriptionService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should create subscription', async () => {
    const userId = 'user-1'
    const planId = 'plan-1'
    
    const result = await service.createSubscription(userId, planId)
    
    expect(result).toBeDefined()
    expect(result.userId).toBe(userId)
    expect(result.planId).toBe(planId)
    expect(result.status).toBe('active')
  })
})
```

### E2E Tests
```typescript
// subscription.e2e-spec.ts
describe('Subscription (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/subscription/plans/foundation (GET)', () => {
    return request(app.getHttpServer())
      .get('/subscription/plans/foundation')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(0)
      })
  })
})
```

## Monitoring and Analytics

### Subscription Metrics
```typescript
// services/analytics.service.ts
@Injectable()
export class AnalyticsService {
  async getSubscriptionMetrics() {
    return {
      totalSubscriptions: await this.prisma.subscription.count(),
      activeSubscriptions: await this.prisma.subscription.count({
        where: { status: 'active' }
      }),
      monthlyRevenue: await this.getMonthlyRevenue(),
      churnRate: await this.getChurnRate(),
      planDistribution: await this.getPlanDistribution()
    }
  }

  private async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        startDate: { gte: startOfMonth }
      },
      include: { plan: true }
    })

    return subscriptions.reduce((total, sub) => total + sub.plan.price, 0)
  }
}
```

## Best Practices

### 1. Plan Design
- Keep plans simple and easy to understand
- Use clear, benefit-focused feature descriptions
- Offer clear upgrade paths
- Include popular plan highlighting

### 2. Pricing Strategy
- Research competitor pricing
- Test different price points
- Offer annual discounts
- Provide free trials

### 3. Limit Enforcement
- Be transparent about limits
- Provide clear upgrade prompts
- Allow temporary overages with warnings
- Monitor usage patterns

### 4. Payment Processing
- Use secure payment providers (Stripe, PayPal)
- Handle failed payments gracefully
- Provide clear billing information
- Offer multiple payment methods

### 5. Customer Support
- Provide clear plan comparison
- Offer plan change flexibility
- Handle cancellations smoothly
- Provide usage analytics

## Troubleshooting

### Common Issues

#### Payment Failures
```typescript
// Handle payment failures
async handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await this.prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription }
  })

  if (subscription) {
    // Send notification to user
    await this.notificationService.sendPaymentFailedNotification(
      subscription.userId
    )
    
    // Set grace period
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'payment_failed',
        gracePeriodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    })
  }
}
```

#### Limit Exceeded
```typescript
// Handle limit exceeded
async checkLimit(userId: string, resourceType: string): Promise<boolean> {
  const limits = await this.subscriptionService.checkUserLimits(userId)
  const usage = await this.usageService.getUsage(userId, resourceType)
  
  if (usage >= limits[resourceType]) {
    // Send upgrade prompt
    await this.notificationService.sendUpgradePrompt(userId, resourceType)
    return false
  }
  
  return true
}
```

## Conclusion

This subscription plan system provides a flexible, scalable foundation for monetizing the PC Solutions platform. The implementation includes:

- **Flexible Plan Structure** - Support for multiple user types and plan tiers
- **Payment Integration** - Secure payment processing with Stripe
- **Usage Tracking** - Real-time limit enforcement and monitoring
- **Admin Management** - Complete plan management interface
- **Analytics** - Comprehensive subscription metrics and reporting

The system is designed to be easily extensible and maintainable, with clear separation of concerns and comprehensive testing coverage.