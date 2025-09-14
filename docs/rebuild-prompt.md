# Prompt: PC-Solutions Platform Rebuild

## 1. The Goal

Your mission is to execute a complete rebuild of the Pro Crèche Solutions platform. You will build a new, secure, stable, and scalable platform from the ground up, based on the detailed specifications provided. The existing repository should be used for reference only, to understand the original business logic and data structures; do not reuse any of the existing application code.

## 2. Your Resources

You have access to two key sets of documents in this repository:

1.  **The Assessment (`docs/assessment/`):** This directory contains a detailed analysis of the original codebase, highlighting its critical flaws. Use this to understand *why* we are rebuilding.
2.  **The Rebuild Specification (`docs/`):** This is your primary blueprint. It contains a series of documents detailing the architecture, features, and requirements for the new platform:
    -   `rebuild-specification.md`: The main document, outlining the high-level plan.
    -   `ui-guide.md`: Details on the site map, wireframes, and UI for key features.
    -   `i18n-specification.md`: A comprehensive guide to implementing internationalization.
    -   `onboarding-guide.md`: Details on the signup and profile flow for organizations.
    -   `dashboards-guide.md`: Specifications for the role-based dashboards.
    -   `subscription-guide.md`: Details on the subscription model.
    -   `new-features-guide.md`: Specifications for new admin features like a log console and subscription management.

## 3. The Task: Step-by-Step Implementation

You must follow the implementation roadmap outlined in `docs/rebuild-specification.md`. Your work should be structured in pull requests that correspond to the phases and milestones in the roadmap.

### Phase 1: Foundations (First 30 Days)

**Objective:** Establish a rock-solid foundation for the new platform.

1.  **Project Setup:**
    -   Initialize a new monorepo using Turborepo and pnpm.
    -   Create three initial packages: `frontend`, `admin`, and `api`.
    -   Set up ESLint, Prettier, and TypeScript configurations for all packages.
    -   Create a basic CI/CD pipeline in GitHub Actions that runs `lint`, `type-check`, and `test` on every push.
2.  **API & Database:**
    -   Set up the NestJS application for the `api` package.
    -   Define the full database schema in `packages/api/prisma/schema.prisma`, based on the ERD and data model in the specification. Use PostgreSQL as the database provider.
    -   Implement core observability: structured logging (with Winston), request IDs, and a centralized error handler.
3.  **Authentication:**
    -   Implement the full authentication system using Clerk. This includes:
        -   Signup, Login, and Password Reset pages on the frontend, using the standard Clerk React components (`<SignUp/>`, `<SignIn/>`).
        -   A backend middleware to validate Clerk JWTs and populate `req.user`.
        -   A robust RBAC middleware that checks user roles for protected endpoints.
    -   Create a user sync mechanism to create a user in your local database when a new user signs up via Clerk.

### Phase 2 & 3: Feature Development

**Objective:** Build out the features of the platform on top of the new foundation.

-   Follow the roadmap to implement the features in the specified order: Profile Management, Subscriptions, Marketplace, Recruitment, etc.
-   For each feature, you must:
    -   **Write tests first:** Follow a TDD approach where possible. All new code must have at least 80% test coverage.
    -   **Build the API endpoint:** Implement the required business logic on the server, ensuring all operations are protected by the RBAC middleware.
    -   **Build the UI component:** Implement the user interface in the `frontend` or `admin` package.
    -   **Submit a pull request:** Each major feature or milestone should be submitted as a separate pull request for review.

## 4. Key Principles to Follow

-   **Security First:** All code must be written with security in mind. Sanitize all user input, enforce RBAC on all endpoints, and follow the security guidelines in the specification.
-   **Quality is Non-Negotiable:** All code must be well-structured, typed, linted, and tested. No pull request will be merged if it breaks the build or fails the tests.
-   **Follow the Spec:** The specification documents are your source of truth. If you have any questions or see any ambiguities, you must ask for clarification.
-   **Clean Architecture:** The backend should be organized into modules (e.g., `UsersModule`, `ProductsModule`), with a clear separation between controllers, services, and repositories.

Your first action should be to start with Phase 1, Milestone 1: setting up the new monorepo. Good luck.
