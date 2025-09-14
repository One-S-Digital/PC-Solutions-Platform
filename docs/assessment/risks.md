# Risk Register

This document outlines the key risks associated with the Pro Crèche Solutions platform, both in its current state and during the proposed rebuild.

| Risk ID | Risk Description | Likelihood (1-5) | Impact (1-5) | Risk Score (L*I) | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-01** | **Security Breach due to Existing Vulnerabilities** | 5 (Very High) | 5 (Very High) | 25 | The current application should be taken offline or firewalled immediately to prevent exploitation of the privilege escalation and missing RBAC vulnerabilities. The rebuild should prioritize a secure-by-design approach. |
| **R-02** | **Data Corruption or Loss** | 4 (High) | 5 (Very High) | 20 | The inconsistent auth system and lack of data integrity checks in the current application could lead to data corruption. The data migration process during the rebuild must be thoroughly tested to prevent data loss. |
| **R-03** | **Business Disruption during Rebuild** | 3 (Medium) | 4 (High) | 12 | The rebuild will take time, and the business needs to have a clear plan for how to operate during this period. A phased rollout or a parallel run of the old and new systems could be considered, but given the state of the old system, a clean cutover is likely the best option. |
| **R-04** | **Rebuild Project Delays** | 3 (Medium) | 3 (Medium) | 9 | The scope of the rebuild is large. The project must have a dedicated team, clear requirements, and strong project management to stay on track. The 90-day roadmap is aggressive and may need to be adjusted. |
| **R-05** | **User Resistance to New Platform** | 2 (Low) | 3 (Medium) | 6 | Users may be resistant to a new UI/UX. The new design should be user-friendly and intuitive. A beta testing program with a group of existing users could help gather feedback and ease the transition. |
| **R-06** | **Incomplete Feature Parity** | 2 (Low) | 4 (High) | 8 | There is a risk that the rebuild will not achieve full feature parity with the old system, leading to a loss of functionality for some users. The requirements for the rebuild must be clearly defined and tracked. |

---
**Likelihood Scale:**
1 - Very Low
2 - Low
3 - Medium
4 - High
5 - Very High

**Impact Scale:**
1 - Negligible
2 - Minor
3 - Moderate
4 - Significant
5 - Severe/Catastrophic
