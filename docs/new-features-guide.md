# New Features Guide

This document outlines the specifications for new features to be included in the rebuilt platform.

## 1. Admin Dashboard: Log Console

### Purpose
To provide administrators with a real-time view of system logs directly within the admin dashboard, enabling them to monitor system health and debug issues without needing direct access to the server or a third-party logging service.

### UI/UX
- A new "Log Console" page will be added to the admin dashboard.
- The UI will feature a filterable and searchable log viewer.
- Filters should include:
  - Log level (INFO, WARN, ERROR)
  - Time range (e.g., last 15 minutes, last hour, custom range)
  - Free-text search for message content or request IDs.
- Each log entry should be expandable to show the full structured log object (e.g., request details, stack trace).
- The console should support real-time log streaming (e.g., via WebSockets).

### Technical Implementation
- The backend will need a new API endpoint (e.g., `/api/admin/logs`) that can be polled or a WebSocket endpoint that streams logs.
- This endpoint must be protected and accessible only to `SUPER_ADMIN` users.
- The Winston logger on the backend should be configured with a transport that sends logs to a service that can be easily queried by the API (e.g., a dedicated logging database like Elasticsearch or a capped collection in MongoDB).

## 2. Admin Dashboard: Subscription Price Management

### Purpose
To allow administrators to manage the pricing and features of subscription plans directly from the admin dashboard, without needing to make code changes and redeploy the application.

### UI/UX
- A new "Subscription Plans" page will be added to the admin dashboard settings.
- The UI will display a list of all available subscription tiers (e.g., "Foundation - Essential", "Supplier Plan").
- For each tier, an admin should be able to:
  - Edit the monthly and yearly price.
  - View a list of all features associated with the tier.
  - Enable or disable specific features for that tier using toggles or checkboxes.
- All changes must be confirmed via a "Save" button.

### Technical Implementation
- The database will need a `SubscriptionTier` model to store the details for each plan, including prices and a JSON object for feature flags.
- New backend API endpoints will be required:
  - `GET /api/admin/subscription-tiers`: To fetch all tiers.
  - `PUT /api/admin/subscription-tiers/:id`: To update a specific tier.
- These endpoints must be protected and accessible only to `SUPER_ADMIN` users.
- The backend's feature gating logic will need to read from this database table instead of using hardcoded values.

## 3. Admin Dashboard: System Monitoring

### Purpose
To provide administrators with a real-time, high-level overview of the platform's health, covering application performance, server resources, and database status. This allows for proactive issue detection and capacity planning.

### Key Metrics to Monitor

#### Host / Container Metrics (for each service: API, Frontend, Admin)
- **CPU Usage:** Average and p95/p99 peaks. Alerts on sustained high usage (e.g., >80% for 5 mins).
- **Memory Usage:** Total vs. Used. Alerts on low available memory (e.g., <15% free).
- **Disk I/O:** Read/write operations per second. Important for identifying storage bottlenecks.
- **Network I/O:** Ingress/egress traffic.

#### Application Metrics (API)
- **API Latency:** p95 and p99 response times for all endpoints, especially key ones like `/login`, `/me`, `/products`.
- **API Error Rate:** Count of 4xx and 5xx HTTP status codes. Alerts on spikes in the 5xx rate.
- **Request Rate:** Requests per second/minute to track traffic patterns.

#### Database Metrics (PostgreSQL)
- **CPU & Memory Usage:** Similar to host metrics, but for the database instance itself.
- **Storage Space:** Total, used, and free storage. Alerts when free space drops below a threshold (e.g., 20%).
- **Active Connections:** Number of active connections to the database. Alerts on unusually high numbers.
- **Slow Query Count:** Number of queries exceeding a time threshold (e.g., >500ms).
- **Index Hit Rate:** Percentage of queries that use an index. A low rate indicates missing or inefficient indexes.

### Technical Implementation

- **Tooling:**
  - **Prometheus:** For time-series data collection and storage. Cloud providers like Render often have built-in Prometheus-compatible metric scraping.
  - **Grafana:** For creating dashboards to visualize the metrics collected by Prometheus.
  - **`prom-client`:** A Node.js client library to instrument the backend API and expose custom metrics.

- **Metrics API Endpoint:**
  - A new endpoint, `GET /api/metrics`, will be created on the backend.
  - This endpoint will be protected by a secret token to prevent public access.
  - It will expose metrics in the Prometheus exposition format.
  - The `prom-client` library will be used to automatically collect default Node.js and system metrics, as well as custom application metrics (like API latency and error rates).

- **Environment Variables:**
  - `PROMETHEUS_SCRAPE_TOKEN`: A secret token that Prometheus must provide in a header (e.g., `Authorization: Bearer <token>`) to access the `/api/metrics` endpoint.

- **Admin Dashboard Integration:**
  - The "System Monitor" page in the admin dashboard will be enhanced.
  - Instead of using mock data, it will fetch data from new, dedicated admin API endpoints (e.g., `GET /api/admin/system-health-summary`).
  - These endpoints will query the monitoring system (or a cached summary of it) to provide a simplified, user-friendly view of the key metrics listed above. This avoids exposing the raw complexity of Prometheus/Grafana to the admin user.
