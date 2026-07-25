# Application & Staffing Status Glossary

## Job Application Statuses

| Status | Description |
|---|---|
| PENDING | Application submitted, not yet reviewed |
| REVIEWED | Foundation has opened and read the application |
| SHORTLISTED | Candidate selected for further consideration |
| INTERVIEW | Interview scheduled or completed |
| OFFER | Employment offer extended to candidate |
| HIRED | Candidate accepted and onboarded |
| REJECTED | Application declined at any stage |
| ACCEPTED | Legacy synonym for HIRED (avoid in new code) |

## Replacement Request Statuses

| Status | Description |
|---|---|
| OPEN | Request posted, seeking educators |
| MATCHED | At least one educator proposed |
| CONFIRMED | Replacement confirmed by foundation |
| CANCELLED | Request withdrawn |
| EXPIRED | Request past its start date with no confirmation |

## Educator Approval Statuses

| Status | Description |
|---|---|
| PENDING_REVIEW | Educator signed up; awaiting admin verification |
| APPROVED | Admin approved; educator can access the platform |
| REJECTED | Admin rejected; account not active |

## Consent Statuses (AI)

| Status | Description |
|---|---|
| isActive=true, revokedAt=null | Consent active — AI may process this profile |
| isActive=false OR revokedAt set | Consent revoked — AI must not process this profile |
