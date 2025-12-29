# Message System — Architecture & Implementation (Consolidated)

Accurate, implementation-based guide for developers and AI agents working on the messaging feature (NestJS + Prisma backend, React/Clerk frontend, Socket.IO gateway, admin dashboard).

---

## 1) System Overview
- **Role in platform**: In-app messaging for direct, group, and support-style chats across the main frontend and the admin dashboard.
- **Lifecycle**
  - **Send**: Frontend uploads attachment (if any) to `/upload/file`, then calls `POST /messaging/messages` with content, type, and file metadata.
  - **Persist**: Backend resolves Clerk/AppUser IDs → `User.id`, stores message + file metadata, bumps `conversation.lastMessageAt`.
  - **Broadcast**: Gateway emits to room `conversation:{id}` (`new-message`, `message-updated`, `message-deleted`; `user-typing`).
  - **Display**: Frontend reloads messages (WS-triggered + 5s polling fallback), transforms secure download URLs, renders `MessageBubble`.
  - **Read**: `POST /messaging/conversations/:id/read` marks others’ messages as `isRead=true` and updates `lastReadAt`; UI mirrors state.
- **Realtime model**: Socket.IO namespace `/messaging` + client polling (5s) for the active conversation.
- **Data flows**
  - Send: ChatWindow → `messagingService.sendMessage` → REST → Prisma create → transform file URL → WS broadcast → clients reload.
  - Receive: WS `new-message` or poll → `messagingService.getMessages` → sort asc in UI → render.
- **Key files**
  - Backend: `api/src/messaging/messaging.controller.ts`, `api/src/messaging/messaging.service.ts`, `api/src/messaging/messaging.gateway.ts`, `api/src/messaging/messaging.module.ts`, `api/src/messaging/dto/*.ts`, `api/prisma/schema.prisma`.
  - Frontend: `frontend/contexts/MessagingContext.tsx`, `frontend/services/messagingService.ts`, `frontend/components/messaging/*`, `frontend/hooks/useMessagingSocket.ts`.
  - Admin: `admin/src/pages/Messaging.tsx`, `admin/src/services/api.ts`.

---

## 2) Technical Specifications

### 2.1 Frontend
- **Screens/components**
  - Conversation list: `ConversationList`, `ConversationListItem`.
  - Thread: `ChatWindow` + `MessageBubble`.
  - Composer: inside `ChatWindow` (text, emoji picker, file picker).
  - Group creation: `CreateGroupChatModal`.
- **State & data**
  - `MessagingContext` holds conversations, per-conversation messages, paging, unread counts, active conversation, optimistic updates.
  - Polling every 5s for the active conversation; debounced conversation loading; deduplication via `Set` by `id`.
  - `useMessagingSocket` joins `conversation:{id}` rooms, handles `new-message`, `message-updated`, `message-deleted`, `user-typing`.
- **Attachment handling**
  - Upload via `useAuthenticatedApi().upload('/upload/file', { assetKind, conversationId })`; uses returned `publicUrl/url`, `filename`, `size`, `mimeType`.
  - Send message with `fileUrl` (storage key or secure URL) + metadata.
  - Display: `MessageBubble` fetches secure download with auth token, builds blob URL for images; files support preview/download.
- **Optimizations**
  - Messages fetched desc, sorted asc for render; infinite scroll (load older pages, keep scroll position).
  - Deduped message lists; optimistic append then refresh; reuse Socket.IO; typing indicators throttled; debounced conversation fetch.
- **Unread badges**
  - Client-side: count messages in a conversation where `senderId !== currentUser.id && !isRead`.

### 2.2 Backend
- **Prisma models (real)**
  - `Conversation`: `id`, `type` (`DIRECT|GROUP|SUPPORT`), `title?`, `lastMessageAt`, timestamps, relations to participants/messages.
  - `ConversationParticipant`: `conversationId`, `userId`, `joinedAt`, `lastReadAt`, `isActive`.
  - `Message`: `conversationId?`, `senderId`, `receiverId?`, `content`, `messageType` (`TEXT|FILE|IMAGE|SYSTEM`), `fileUrl` (storage key), `fileName`, `fileSize`, `mimeType`, `isRead`, `createdAt`.
- **Controllers/endpoints (`messaging.controller.ts`)**
  - Conversations: `POST /messaging/conversations`, `GET /messaging/conversations`, `GET /messaging/conversations/:id`.
  - Messages: `GET /messaging/conversations/:id/messages?page&limit`, `POST /messaging/messages`, `PATCH /messaging/messages/:id`, `DELETE /messaging/messages/:id`.
  - Read: `POST /messaging/conversations/:id/read`, `GET /messaging/unread-count`.
  - Legacy/direct: `POST /messaging/direct-messages`.
  - Participants: `POST /messaging/conversations/:id/participants`, `DELETE /messaging/conversations/:id/participants/:userId`.
  - Search/analytics: `GET /messaging/search`, `GET /messaging/stats` (admin-only).
  - Note: No per-message read endpoint; frontend helper path unused.
- **Services (`messaging.service.ts`)**
  - Resolves raw Clerk/AppUser IDs to `User.id`; enforces role-based allowed recipients.
  - Creates conversations, messages (with storage-key transform), updates/deletes messages (soft delete → `SYSTEM`, clears file fields).
  - Marks conversation messages read (for non-sender) and updates `lastReadAt`.
  - Counts unread across user’s conversations; search; participant add/remove; legacy direct-message helper.
  - Transforms stored file keys to secure download URLs in responses.
- **Gateway (`messaging.gateway.ts`)**
  - Namespace `/messaging`; events: `join-conversation`, `leave-conversation`, `typing-start/stop`, broadcasts `new-message`, `message-updated`, `message-deleted`.
  - Rooms: `conversation:{id}`.
  - **Gap**: Authentication/authorization TODO; currently trusts `userId` from handshake/auth payload (insecure).
- **Auth/roles**
  - REST protected by `RolesGuard`; conversation creation checks allowed roles via `getAllowedMessagingRoles`.
  - Gateway auth missing (must be fixed before production).
- **File security**
  - Store storage keys only; responses convert to `/api/upload/download/{key}`. Soft delete nulls file metadata.

---

## 3) Implementation Guide — Extending
- **New message types**: Extend enums (`MessageType`), Prisma (if needed), DTO validation, backend create logic, transformations, UI render (`MessageBubble`), composer controls, optimistic paths.
- **New metadata (edited, reactions, delivery states)**: Add columns; include in service responses and gateway broadcasts; extend frontend types, transforms, rendering, and optimistic updates; keep sorting consistent if new timestamps appear.
- **New features**
  - Search: Backend endpoint exists; add UI wiring.
  - Pinning: Add `pinnedAt`, expose endpoints, render pin badge/order.
  - Muting: Add participant `mutedUntil`; honor in notifications.
  - Typing indicators: Already present; secure gateway auth first.
  - New conversation types: Extend `ConversationType` enum, DTOs, creation logic, and UI labels.
- **Upload/file handling updates**: Keep storage-key pattern; validate server-side; ensure transform to secure download URLs; update attachment previews/download buttons.
- **Rendering/transform updates**: Keep asc message ordering in UI, desc fetch in backend; maintain dedupe; update legacy compatibility transforms in `messagingService.transformMessage`.

---

## 4) Developer Workflow Requirements
1) Update Prisma models/enums; migrate.
2) Update backend services (`messaging.service.ts`) and DTO validation.
3) Adjust controllers/endpoints; ensure `RolesGuard` coverage.
4) Update frontend API wrappers (`frontend/services/messagingService.ts`) and context logic.
5) Update UI components (`MessageBubble`, `ChatWindow`, lists) and rendering paths.
6) Enforce permission/role checks; only participants access conversations/messages.
7) Testing: send/receive (text + attachments), read receipts, ordering, role restrictions, WS + polling interaction, upload/download security.
8) Regression: conversation ordering, unread badges, infinite scroll, group creation, admin flows.

---

## 5) Critical Compliance Requirements (Rules)
- Never bypass backend messaging services or insert directly into DB.
- Never store or expose public file URLs; always use storage key + secure download endpoint.
- Never skip permission/role checks; use `RolesGuard` and participant checks.
- Always join/broadcast in `conversation:{id}` rooms for realtime.
- Always update enums, DTOs, services, and UI together when adding types/statuses.
- Always test ordering, read receipts, and attachment flows after changes.

---

## 6) Common Mistakes to Avoid (and fixes)
- ❌ Mutating message arrays directly → ✅ Use state setters with copies + dedupe by `id`.
- ❌ Missing sort updates when adding fields → ✅ Sort messages by `createdAt` asc in UI; conversations by `lastMessageAt` desc.
- ❌ Hardcoding message types/status → ✅ Extend enums + DTOs + renderer switch paths.
- ❌ Skipping validation for new types → ✅ Add DTO checks (e.g., require `fileUrl` for FILE/IMAGE) and service-level validation.
- ❌ Forgetting UI updates for new metadata → ✅ Extend `Message` type, render badges/labels, adjust optimistic updates.

---

## 7) Known Gaps / TODOs
- WebSocket authentication/authorization missing; currently trusts handshake `userId`.
- No per-message read endpoint; only conversation-level read exists.
- Server-side attachment validation (size/type) missing; currently UI-side only.

---

## 8) Diagrams & Flow Summaries

### Send / Receive / Read
```
User types/upload
 -> ChatWindow (composer)
 -> upload /upload/file -> storage key
 -> POST /messaging/messages (token, content, type, file metadata)
 -> Prisma save + lastMessageAt update
 -> transform file key -> /api/upload/download/{key}
 -> WebSocket broadcast (conversation:{id}) + optimistic append
 -> MessagingContext refresh (WS trigger + 5s poll)
 -> MessageBubble render (secure download, preview/download)
 -> POST /messaging/conversations/:id/read
    -> mark others' messages isRead=true, update lastReadAt
    -> UI marks read
```

### Realtime + Polling
```
Socket.IO /messaging namespace
  join-conversation -> room conversation:{id}
  typing-start/stop -> user-typing events
  new-message / message-updated / message-deleted -> broadcast to room

Fallback poll (5s) for active conversation:
  GET /messaging/conversations/:id/messages?page=1&limit=50
  dedupe + sort asc -> render
```

---

## 9) File Index (exact paths)
- Backend: `api/src/messaging/messaging.controller.ts`, `api/src/messaging/messaging.service.ts`, `api/src/messaging/messaging.gateway.ts`, `api/src/messaging/messaging.module.ts`, `api/src/messaging/dto/create-message.dto.ts`, `api/src/messaging/dto/create-conversation.dto.ts`, `api/prisma/schema.prisma`.
- Frontend: `frontend/contexts/MessagingContext.tsx`, `frontend/services/messagingService.ts`, `frontend/components/messaging/ChatWindow.tsx`, `frontend/components/messaging/MessageBubble.tsx`, `frontend/components/messaging/ConversationList.tsx`, `frontend/components/messaging/ConversationListItem.tsx`, `frontend/components/messaging/CreateGroupChatModal.tsx`, `frontend/hooks/useMessagingSocket.ts`.
- Admin: `admin/src/pages/Messaging.tsx`, `admin/src/services/api.ts`.

