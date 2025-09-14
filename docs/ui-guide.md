# UI / UX Guide

## 1. Site Map

- **Public Pages:**
  - Home
  - Login
  - Signup
  - Parent Lead Form
- **Shared Authenticated Pages:**
  - Dashboard (Role-specific landing page)
  - Marketplace
  - Messages
  - Settings
  - Subscription Management
  - Partners
  - State Policies
  - HR Procedures
  - E-Learning Library
- **Role-Specific Pages:**
  - **Foundation:**
    - Analytics
    - Organization Profile
    - Orders & Appointments
  - **Supplier:**
    - Product Listings
    - Orders
  - **Service Provider:**
    - Service Listings
    - Requests
  - **Educator/Candidate:**
    - Profile
    - Job Board
    - Applications
  - **Parent:**
    - My Enquiries
  - **Admin:**
    - Content Management

## 2. Key Flow Wireframes (Descriptions)

- **Signup:** A multi-step process.
  - **Step 1:** User selects their primary role (Foundation, Supplier, etc.) from a grid of options.
  - **Step 2:** A dynamic form appears with fields relevant to the selected role (e.g., "Organization Name" for foundations, "Child's Age" for parents).
  - **Step 3:** After successful submission and email verification, the user is redirected to their role-specific dashboard.
- **Profile Management:**
  - A dedicated settings page with editable forms for personal and/or organization details.
  - Forms should have real-time validation feedback.
  - Avatar and cover image uploads should be handled via a modal with drag-and-drop support.
- **Settings Page:**
  - A tabbed interface to separate different categories of settings.
  - Sections should include Company Details, Notifications, Team Members (for organizations), and Subscription/Billing.
- **Messaging:**
  - A classic split-pane layout.
  - The left pane lists all active conversations, with the most recent at the top and unread indicators.
  - The right pane displays the chat window for the selected conversation.
- **File Upload Modal:**
  - A consistent modal component used for all file uploads.
  - Should support drag-and-drop and file selection.
  - Displays a preview for image files.
  - Shows a progress bar during upload.
  - For admin-uploaded content, should include toggles for role-based access control.

## 3. Content Management UI

### 3.1. E-Learning Library

#### Structure
- **Dashboard:**
  - A list or grid view of all available learning resources.
  - Filters for resource type (course, video, PDF, link), category, and language.
- **Course Detail Page:**
  - Displays the course title, full description, and a list of modules or lessons.
  - Shows any downloadable attachments.
  - Includes a comments section for discussion.
  - Tracks and displays the user's completion status for the course.

#### Upload Form
- **Fields:**
  - Title (text input)
  - Type (dropdown: Course, Video, PDF, Link)
  - Description (textarea)
  - File Upload (for video/PDF) or URL input (for link)
  - Category (text input or dropdown)
  - Tags (chip input for multiple tags)
  - Language (dropdown)
  - Optional Prerequisites (multi-select for other courses)
- **Validation:**
  - Title, Type, and either File or URL are required.
  - File uploads must be validated for type and size.
- **Actions:**
  - "Save Draft" button to save without publishing.
  - "Publish" button to make the resource live.

### 3.2. HR Document Repository

#### Structure
- **Main View:**
  - A list or grid view of all HR documents.
  - Filters for Category, Tags, and a "Favorites" toggle.
  - Search bar for full-text search within document titles and descriptions.
- **Document Detail Page:**
  - Displays the document title, category, tags, and a short description.
  - Provides a prominent "Download" link. For PDFs, an inline preview should be attempted.
  - A "Favorite" toggle button (star icon).

#### Upload Form
- **Fields:**
  - Title (text input)
  - Category (dropdown, e.g., "Contracts", "Templates", "Guides")
  - Tags (chip input)
  - Language (dropdown)
  - File Upload
  - "Mark as Favorite" (checkbox/toggle)
- **Validation:**
  - Title, Category, and File are required fields.
- **Actions:**
  - "Save" and "Cancel" buttons.

### 3.3. Policy Documents & Alerts

#### Structure
- **Policy List:**
  - A table view showing all policy documents.
  - Columns: Title, Version, Status (Draft, In Review, Published, Archived), Last Updated Date.
  - Actions per row: Edit, Publish, Archive.
- **Alert View:**
  - A prominent section on the dashboard or a dedicated page highlighting new or critical policies that require user attention.

#### Upload & Publication Workflow
- **Fields:**
  - Title (text input)
  - Document Upload
  - Summary (textarea for a brief overview)
  - Category (dropdown)
  - Effective Date (datepicker)
  - Version Number (text input, e.g., "1.0")
  - Status (dropdown: Draft, Published)
  - Reviewer/Approver Assignment (user multi-select, for future workflow implementation)
- **Workflow:**
  - An author creates a document in "Draft" status.
  - The author can manually notify a reviewer.
  - An approver can change the status to "Published".
- **Validation:**
  - Title, Document, Effective Date, and Status are required.
- **Actions:**
  - "Save Draft"
  - "Publish" (for users with approval permissions)
  - "Cancel"
