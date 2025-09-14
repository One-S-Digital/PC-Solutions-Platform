# Role-Based Access Control (RBAC) Matrix

This matrix outlines the expected access levels for each user role across the platform's main features.

- **C**: Create
- **R**: Read
- **U**: Update
- **D**: Delete
- **-**: No Access
- **(self)**: Can only perform the action on their own resources.
- **(org)**: Can perform the action on resources within their organization.

| Feature / Role | Super Admin | Admin | Foundation | Product Supplier | Service Provider | Educator/Candidate | Parent |
|---|---|---|---|---|---|---|---|
| **Auth & Profile** | | | | | | | |
| Signup | C | C | C | C | C | C | C |
| Login / Logout | C | C | C | C | C | C | C |
| Manage Own Profile | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| Manage Any User Profile | CRUD | CRUD | - | - | - | - | - |
| **Organizations** | | | | | | | |
| Create Org | C | C | - | - | - | - | - |
| View Any Org | R | R | - | - | - | - | - |
| Update Any Org | U | U | U (org) | U (org) | U (org) | - | - |
| Delete Org | D | D | - | - | - | - | - |
| **Marketplace** | | | | | | | |
| View Products/Services | R | R | R | R (org) | R (org) | R | R |
| Manage Products | CRUD | CRUD | - | CRUD (org) | - | - | - |
| Manage Services | CRUD | CRUD | - | - | CRUD (org) | - | - |
| Place Orders | - | - | C | - | - | - | - |
| View Own Orders | - | - | R (org) | R (org) | - | - | - |
| Fulfill Orders | - | - | - | U (org) | - | - | - |
| Make Service Requests | - | - | C | - | - | - | - |
| Fulfill Service Requests| - | - | - | - | U (org) | - | - |
| **Recruitment** | | | | | | | |
| View Job Listings | R | R | R | R | R | R | R |
| Manage Job Listings | CRUD | CRUD | CRUD (org) | - | - | - | - |
| Apply to Jobs | - | - | - | - | - | C | - |
| View Candidate Profiles | R | R | R (org) | - | - | R (self) | - |
| **Content** | | | | | | | |
| Manage HR Docs | CRUD | CRUD | - | - | - | - | - |
| Manage Courses | CRUD | CRUD | - | - | - | - | - |
| Manage Policy Docs | CRUD | CRUD | - | - | - | - | - |
| View Content | R | R | R | R | R | R | R |
| **Parent Leads** | | | | | | | |
| Submit Lead Form | - | - | - | - | - | - | C |
| View Own Leads | - | - | - | - | - | - | R (self) |
| View All Leads | R | R | R (org) | - | - | - | - |
| Respond to Leads | - | - | U (org) | - | - | - | - |
| **Messaging** | | | | | | | |
| Send/Receive Messages | C | C | C | C | C | C | C |
| **Admin Dashboard** | | | | | | | |
| Access Admin Dashboard | Yes | Yes | No | No | No | No | No |
| Manage Users | CRUD | CRUD | - | - | - | - | - |
| Manage Orgs | CRUD | CRUD | - | - | - | - | - |
| System Monitoring | R | R | - | - | - | - | - |
| Frontend Settings | U | U | - | - | - | - | - |
