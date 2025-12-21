import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { resolveBillingPeriod } from './billing-period.util';

export interface BillingTransaction {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageTransactionValue: number;
  paymentSuccessRate: number;
  refundRate: number;
  revenueByMonth: Array<{ month: string; revenue: number; transactions: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; percentage: number }>;
  failedPayments: Array<{ reason: string; count: number; percentage: number }>;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async processPayment(subscription: any): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with Stripe
      // For now, we'll simulate payment processing
      
      const paymentIntent = await this.createPaymentIntent({
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: subscription.plan.currency,
        description: `Payment for ${subscription.plan.name} subscription`,
        metadata: {
          userId: subscription.userId,
          planId: subscription.planId,
          billingPeriod: subscription.plan.billingPeriod,
        },
      });

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, we'll assume 95% success rate
      const success = Math.random() > 0.05;

      if (success) {
        await this.updatePaymentStatus(paymentIntent.id, 'succeeded', {
          stripePaymentIntentId: `pi_${Date.now()}`,
          stripeChargeId: `ch_${Date.now()}`,
        });

        this.logger.log(`Payment succeeded for subscription ${subscription.id}`);
        return true;
      } else {
        await this.updatePaymentStatus(paymentIntent.id, 'failed', {
          failureReason: 'Card declined',
        });

        this.logger.warn(`Payment failed for subscription ${subscription.id}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to process payment: ${(error as Error).message}`);
      return false;
    }
  }

  async createPaymentIntent(paymentData: {
    subscriptionId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }): Promise<BillingTransaction> {
    try {
      const transaction = await this.prisma.billingTransaction.create({
        data: {
          subscriptionId: paymentData.subscriptionId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'pending',
          description: paymentData.description,
          metadata: paymentData.metadata,
        },
      });

      this.logger.log(`Created payment intent: ${transaction.id}`);
      return transaction as BillingTransaction;
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${(error as Error).message}`);
      throw error;
    }
  }

  async updatePaymentStatus(
    transactionId: string,
    status: BillingTransaction['status'],
    additionalData?: {
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      failureReason?: string;
    },
  ): Promise<BillingTransaction> {
    try {
      const updateData: any = { status };
      
      if (additionalData?.stripePaymentIntentId) {
        updateData.stripePaymentIntentId = additionalData.stripePaymentIntentId;
      }
      if (additionalData?.stripeChargeId) {
        updateData.stripeChargeId = additionalData.stripeChargeId;
      }
      if (additionalData?.failureReason) {
        updateData.metadata = {
          failureReason: additionalData.failureReason,
        };
      }

      const transaction = await this.prisma.billingTransaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      this.logger.log(`Updated payment status: ${transaction.id} to ${status}`);
      return transaction as BillingTransaction;
    } catch (error) {
      this.logger.error(`Failed to update payment status: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllTransactions(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      subscriptionId?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<{ transactions: BillingTransaction[]; total: number; pages: number }> {
    const where: any = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.subscriptionId) where.subscriptionId = filters.subscriptionId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.billingTransaction.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billingTransaction.count({ where }),
    ]);

    return {
      transactions: transactions as BillingTransaction[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getTransactionById(transactionId: string): Promise<BillingTransaction | null> {
    const transaction = await this.prisma.billingTransaction.findUnique({
      where: { id: transactionId },
      include: {
        subscription: {
          include: {
            plan: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return transaction as BillingTransaction | null;
  }

  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<BillingTransaction> {
    try {
      const transaction = await this.prisma.billingTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'succeeded') {
        throw new Error('Can only refund succeeded transactions');
      }

      // In a real implementation, this would integrate with Stripe's refund API
      const refundAmount = amount || transaction.amount;
      
      // Create refund transaction
      const refundTransaction = await this.prisma.billingTransaction.create({
        data: {
          subscriptionId: transaction.subscriptionId,
          amount: -refundAmount, // Negative amount for refund
          currency: transaction.currency,
          status: 'refunded',
          description: `Refund for transaction ${transactionId}`,
          metadata: {
            originalTransactionId: transactionId,
            refundReason: reason,
            refundAmount,
          },
        },
      });

      // Update original transaction status
      await this.updatePaymentStatus(transactionId, 'refunded', {
        failureReason: reason,
      });

      this.logger.log(`Processed refund for transaction ${transactionId}: CHF ${refundAmount}`);
      return refundTransaction as BillingTransaction;
    } catch (error) {
      this.logger.error(`Failed to process refund: ${(error as Error).message}`);
      throw error;
    }
  }

  async getBillingAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<BillingAnalytics> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.billingTransaction.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    const successfulTransactions = transactions.filter(t => t.status === 'succeeded');
    const failedTransactions = transactions.filter(t => t.status === 'failed');
    const refundedTransactions = transactions.filter(t => t.status === 'refunded');

    const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = refundedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netRevenue = totalRevenue - totalRefunds;

    const averageTransactionValue = successfulTransactions.length > 0 
      ? totalRevenue / successfulTransactions.length 
      : 0;

    const paymentSuccessRate = transactions.length > 0 
      ? (successfulTransactions.length / transactions.length) * 100 
      : 0;

    const refundRate = totalRevenue > 0 
      ? (totalRefunds / totalRevenue) * 100 
      : 0;

    // Calculate MRR (simplified)
    const monthlyRecurringRevenue = successfulTransactions
      .filter((t) => {
        const resolved = resolveBillingPeriod(t.subscription.plan.billingPeriod);
        return resolved.isRecurring && resolved.monthsPerPeriod === 1;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Revenue by month
    const revenueByMonth = this.calculateRevenueByMonth(successfulTransactions, days);

    // Payment method distribution (simplified - would need actual payment method data)
    const paymentMethodDistribution = [
      { method: 'Credit Card', count: Math.floor(successfulTransactions.length * 0.8), percentage: 80 },
      { method: 'Bank Transfer', count: Math.floor(successfulTransactions.length * 0.15), percentage: 15 },
      { method: 'PayPal', count: Math.floor(successfulTransactions.length * 0.05), percentage: 5 },
    ];

    // Failed payment reasons (simplified)
    const failedPayments = [
      { reason: 'Card Declined', count: Math.floor(failedTransactions.length * 0.6), percentage: 60 },
      { reason: 'Insufficient Funds', count: Math.floor(failedTransactions.length * 0.25), percentage: 25 },
      { reason: 'Expired Card', count: Math.floor(failedTransactions.length * 0.15), percentage: 15 },
    ];

    return {
      totalRevenue: netRevenue,
      monthlyRecurringRevenue,
      averageTransactionValue,
      paymentSuccessRate,
      refundRate,
      revenueByMonth,
      paymentMethodDistribution,
      failedPayments,
    };
  }

  async sendPaymentReminder(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: true,
          user: true,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      await this.emailNotificationService.sendNotification({
        event: 'payment_reminder',
        recipient: subscription.user.email,
        recipientName: subscription.user.firstName,
        payload: {
          firstName: subscription.user.firstName,
          planName: subscription.plan.name,
          amount: subscription.plan.price,
          currency: subscription.plan.currency,
          dueDate: subscription.currentPeriodEnd.toLocaleDateString(),
          paymentUrl: `${process.env.FRONTEND_URL}/billing/payment`,
        },
      });

      this.logger.log(`Sent payment reminder for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder: ${(error as Error).message}`);
      throw error;
    }
  }

  async processFailedPayments(): Promise<void> {
    try {
      const failedSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'PAST_DUE',
          currentPeriodEnd: { lte: new Date() },
        },
        include: {
          plan: true,
          user: true,
        },
      });

      for (const subscription of failedSubscriptions) {
        // Try to process payment again
        const paymentSuccess = await this.processPayment(subscription);

        if (!paymentSuccess) {
          // Send final notice before cancellation
          await this.emailNotificationService.sendNotification({
            event: 'subscription_payment_failed',
            recipient: subscription.user.email,
            recipientName: subscription.user.firstName,
            payload: {
              firstName: subscription.user.firstName,
              planName: subscription.plan.name,
              amount: subscription.plan.price,
              currency: subscription.plan.currency,
              gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 7 days
              paymentUrl: `${process.env.FRONTEND_URL}/billing/payment`,
            },
          });
        }
      }

      this.logger.log(`Processed failed payments for ${failedSubscriptions.length} subscriptions`);
    } catch (error) {
      this.logger.error(`Failed to process failed payments: ${(error as Error).message}`);
      throw error;
    }
  }

  private calculateRevenueByMonth(transactions: any[], days: number): Array<{ month: string; revenue: number; transactions: number }> {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < Math.ceil(days / 30); i++) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthTransactions = transactions.filter(t => 
        t.createdAt >= monthStart && t.createdAt < monthEnd
      );
      
      const revenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      months.unshift({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        transactions: monthTransactions.length,
      });
    }
    
    return months;
  }
}