# Subscription Guide

This document outlines the subscription plans and feature gating for the platform. This specification is based on the mock data found in the v1 codebase and should be validated and refined with business stakeholders.

## 1. Foundation Tiers

Foundations have access to a tiered subscription model with monthly and yearly billing options.

### Basic Plan
- **Price:** To be determined.
- **Features:**
  - Marketplace Access
  - State Policies
  - Unlimited Orders & Service Requests

### Essential Plan
- **Price:** To be determined.
- **Features:**
  - All "Basic" features.
  - **Parent Enquiries:** Up to a limit (e.g., 15 per month).
  - **HR Documents:** Access to the HR document repository.

### Professional Plan
- **Price:** To be determined.
- **Features:**
  - All "Essential" features.
  - **Parent Enquiries:** Unlimited.
  - **Recruitment:** Full access to post jobs and view candidates.
  - **E-Learning:** Access to all e-learning content.
  - **Analytics:** Access to the analytics dashboard.
  - **Team Management:** Ability to invite and manage team members.
  - **Priority Support:** (e.g., WhatsApp support).

### Enterprise Plan
- A custom plan for large organizations with specific needs. Details to be defined.

## 2. Vendor Tiers

### Supplier Plan
- **Price:** To be determined (monthly/yearly).
- **Features:**
  - Full access to manage company profile and product listings.
  - Ability to receive and manage orders.
  - Access to analytics for their products.
  - Team management features.

### Service Provider Plan
- **Price:** To be determined (monthly/yearly).
- **Features:**
  - Full access to manage company profile and service listings.
  - Ability to receive and manage service requests.
  - Access to analytics for their services.
  - Team management features.

## 3. Technical Implementation

- **Payment Gateway:** Stripe will be used to handle all subscription billing and recurring payments.
- **Backend:**
  - The backend will have a `Subscription` model to store the subscription state for each organization.
  - It will use Stripe webhooks to listen for subscription events (e.g., `invoice.payment_succeeded`, `customer.subscription.deleted`) and update the database accordingly.
- **Feature Gating:**
  - All API endpoints related to gated features must be protected by a middleware that checks the user's subscription status and feature access rights before allowing the request to proceed.
