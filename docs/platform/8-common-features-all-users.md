# Common Features (All Users)

Features available to all authenticated users regardless of role.

---

## Table of Contents

1. [Messaging](#messaging)
2. [Notifications](#notifications)
3. [Profile Management](#profile-management)
4. [Settings](#settings)
5. [Support Tickets](#support-tickets)

---

## Messaging

### Accessing Messages

Navigate to `/messages` or click **Messages** in the main menu.

**File Reference:**
- `frontend/pages/MessagesPage.tsx`

### Creating Conversations

1. Go to **Messages**
2. Click **New Conversation**
3. Select recipient(s)
4. Start typing message
5. Send

**API Endpoint:**
- `POST /messaging/conversations`

**File Reference:**
- `api/src/messaging/messaging.controller.ts`

### Conversation Types

- **Direct** - 1-on-1 conversation
- **Group** - Multiple participants
- **Support** - Support-related conversations

### Sending Messages

1. Open conversation
2. Type message
3. Attach files/images (optional)
4. Send

**Message Types:**
- TEXT - Text message
- FILE - File attachment
- IMAGE - Image attachment
- SYSTEM - System message

**API Endpoint:**
- `POST /messaging/messages`

### File Attachments

- Upload files in messages
- Supported file types validated
- File size limits enforced
- Malware scanning (if enabled)

**API Endpoint:**
- `POST /upload` (for message attachments)

**File Reference:**
- `api/src/upload/upload.controller.ts`

### Real-time Updates

Messages are delivered in real-time via WebSocket.

**File Reference:**
- `api/src/messaging/messaging.gateway.ts`
- `frontend/contexts/MessagingContext.tsx`

### Unread Count

View unread message count in navigation.

**API Endpoint:**
- `GET /messaging/unread-count`

---

## Notifications

### Accessing Notifications

Navigate to `/notifications` or click notification bell icon.

**File Reference:**
- `frontend/pages/NotificationsPage.tsx`

### Notification Types

- New messages
- Job application updates
- Order status changes
- Lead responses
- System announcements

**File Reference:**
- `frontend/contexts/NotificationContext.tsx`

---

## Profile Management

### Accessing Profile

Navigate to `/profile` or click profile icon → **Profile**.

**File Reference:**
- `frontend/pages/ProfilePage.tsx`

### Editing Personal Profile

1. Go to **Profile**
2. Edit information:
   - First name, Last name
   - Phone number
   - Contact email (separate from auth email)
3. Upload/update avatar
4. Save

**API Endpoint:**
- `PATCH /users/me`

**File Reference:**
- `api/src/users/users.controller.ts`

### Viewing Public Profiles

- **Organization Profiles:** `/profile/organization/:id`
- **Educator Profiles:** `/profile/educator/:id`

**File Reference:**
- `frontend/pages/profile/OrganizationProfileViewPage.tsx`
- `frontend/pages/profile/EducatorProfileViewPage.tsx`

---

## Settings

### Accessing Settings

Navigate to `/settings` or click profile icon → **Settings**.

**File Reference:**
- `frontend/pages/SettingsPage.tsx`

### Available Settings

- Profile settings
- Notification preferences
- Language preferences
- Billing & Subscription (if applicable)
- Security settings

**API Endpoint:**
- `GET /settings`
- `PATCH /settings`

**File Reference:**
- `api/src/settings/settings.controller.ts`

---

## Support Tickets

### Creating Tickets

1. Navigate to **Support** in menu
2. Click **Create Ticket**
3. Fill in:
   - Subject
   - Category (GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST)
   - Priority (LOW, MEDIUM, HIGH, URGENT)
   - Message
   - Attachments (optional)
4. Submit

**API Endpoint:**
- `POST /support/tickets`

**File Reference:**
- `api/src/support/support.controller.ts`

### Managing Tickets

1. View all your tickets
2. Click ticket to view details
3. Add responses
4. Track status

**API Endpoints:**
- `GET /support/tickets`
- `GET /support/tickets/:id`
- `POST /support/tickets/:id/respond`

### Ticket Status

- **OPEN** - New ticket
- **IN_PROGRESS** - Being worked on
- **RESOLVED** - Issue resolved
- **CLOSED** - Ticket closed

---

## Under the Hood

### API Endpoints

**Messaging:**
- `POST /messaging/conversations`
- `GET /messaging/conversations`
- `POST /messaging/messages`
- `GET /messaging/conversations/:id/messages`

**Support:**
- `POST /support/tickets`
- `GET /support/tickets`
- `POST /support/tickets/:id/respond`

**Files:**
- `api/src/messaging/messaging.controller.ts`
- `api/src/support/support.controller.ts`

---

## Next Steps

- Check [Billing & Subscriptions](./9-billing-and-subscriptions.md) for subscription features
- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md) for help

