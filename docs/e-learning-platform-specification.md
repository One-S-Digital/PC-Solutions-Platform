The e-learning module supplies a library of training materials—courses, videos, PDFs, and external links—each rendered with icons and role-based actions such as viewing, watching, downloading, or opening content, plus admin-only edit/delete buttons

Users can search by text, filter by category, and view content grouped into “Courses,” “Videos,” and “PDFs”; administrators additionally see an “Add New Content” option for uploading resources

The upload modal lets admins define metadata (title, description, category, type, language, access roles, tags, duration, file links, etc.) before submitting new or edited items

A secured REST API backs the interface, providing endpoints to list, fetch, create, update, and delete courses while filtering by search terms, category, type, language, and status; access is enforced with JWT and role checks

The course model captures structured fields—title, description, type, category, duration, lessons, file URL, language, access roles, tags, and status—supporting the features above

