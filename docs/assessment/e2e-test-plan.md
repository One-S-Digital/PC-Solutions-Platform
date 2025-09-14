# End-to-End (E2E) Test Plan

This document outlines the E2E test plan for the Pro Crèche Solutions platform. The tests are written in a Gherkin-like syntax.

## 1. Auth

### Scenario: New user signup and login
- **Given** I am on the signup page
- **When** I select the "Parent" role
- **And** I fill in the signup form with valid details
- **And** I complete the CAPTCHA
- **And** I submit the form
- **Then** I should receive an email verification code
- **When** I enter the verification code
- **Then** my account should be created
- **And** I should be logged in
- **And** I should be redirected to the parent dashboard

### Scenario: Existing user login
- **Given** I have a valid "Foundation" user account
- **When** I go to the login page
- **And** I enter my credentials
- **Then** I should be logged in
- **And** I should be redirected to the foundation dashboard

## 2. Profile Management

### Scenario: User updates their name
- **Given** I am logged in as an "Educator"
- **When** I go to the settings page
- **And** I update my first and last name
- **And** I save the changes
- **Then** my name should be updated in the UI
- **And** my name should be updated in the backend database
- **And** my name should be updated in Clerk

## 3. RBAC

### Scenario: Non-admin user tries to access admin dashboard
- **Given** I am logged in as a "Parent"
- **When** I try to navigate to the `/admin` dashboard
- **Then** I should be redirected to an "Access Denied" page

### Scenario: Non-owner tries to update an organization
- **Given** I am logged in as a "Foundation" user for "Org A"
- **When** I try to send an API request to update "Org B"
- **Then** the request should fail with a 403 Forbidden status

## 4. Subscriptions

### Scenario: User with limited plan hits usage limit
- **Given** I am logged in as a "Foundation" user on the "Essential" plan (limit 15 parent enquiries)
- **And** I have already received 15 parent enquiries
- **When** a new parent enquiry is submitted for my foundation
- **Then** I should not be able to view the new enquiry
- **And** I should see an upsell message prompting me to upgrade my plan

## 5. CORS

### Scenario: Request from allowed origin
- **Given** the main frontend is running on `http://localhost:3000`
- **When** the frontend makes an API request to the backend on `http://localhost:8001`
- **Then** the request should succeed
- **And** the response should have the `Access-Control-Allow-Origin: http://localhost:3000` header

### Scenario: Request from disallowed origin
- **Given** I am on a malicious website `http://evil.com`
- **When** the website tries to make an API request to the backend
- **Then** the request should be blocked by the browser due to CORS policy
- **And** the backend should not send the `Access-Control-Allow-Origin` header

## 6. i18n

### Scenario: User changes language
- **Given** I am on the login page
- **When** I use the language switcher to change the language to "Français"
- **Then** all the static text on the page should be in French
- **When** I log in
- **And** I navigate to the dashboard
- **Then** the dashboard should also be in French
