# E-Learning Module Overview (Current Build)

## Summary

The current e-learning module surfaces a curated library of training resources—courses, on-demand videos, downloadable PDFs, and vetted external links. Each card in the catalog uses consistent iconography to signal the content type and exposes role-scoped actions so users can immediately view, watch, download, or open the material. Administrators continue to see additional edit and delete controls inline for rapid maintenance.

## Content Library Experience

- **Categorised groupings**: Content is automatically organised into `Courses`, `Videos`, and `PDFs`, with a dedicated view for each segment so learners can focus on the format they need.
- **Role-aware actions**: Standard users receive the core consumption actions (view, watch, download, open). Admin users gain extra controls for editing metadata or removing items entirely.
- **Visual cues**: Icons reinforce the content type at-a-glance and align with the action buttons exposed for that resource.

## Discovery & Navigation

- **Text search**: Learners can search by free-text across titles, descriptions, tags, and lessons to immediately surface relevant training.
- **Category filters**: Faceted filters allow narrowing the library to a specific category while maintaining the type-based grouping.
- **Segmented layout**: A combined view renders group headers for `Courses`, `Videos`, and `PDFs`, ensuring parity with the card-level actions.
- **Admin shortcuts**: When admins access the listing they see an `Add New Content` button that opens the upload modal for streamlined onboarding of new resources.

## Content Management Workflow

- **Upload modal**: Administrators manage both net new content and edits through a unified modal.
- **Metadata control**: The modal collects title, description, category, content type, language, access roles, tags, duration, and file or external links before submission.
- **Validation**: Required fields surface inline errors to keep the library consistent and filterable.

## API & Security

- **Secured REST API**: A dedicated REST service powers the interface with endpoints to list, retrieve, create, update, and delete course records.
- **Filtering support**: APIs accept search terms, category, type, language, and status filters so the client can render precise results without over-fetching.
- **Access control**: All endpoints require valid JWT authentication and enforce role checks to guard admin capabilities such as creation, updates, and deletions.

## Data Model

The streamlined course model persists the structured fields required to back the UI and API features:

- `title`, `description`, `type`, and `category`
- `duration` and `lessons` metadata for structured course content
- `fileUrl` and externally hosted links for content delivery
- `language`, `accessRoles`, `tags`, and `status` to support filtering and permissions

This concise specification reflects the functionality currently available in the deployed build and supersedes earlier documents that described a more extensive LMS experience.
