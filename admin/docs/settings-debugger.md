## Settings Page Debugger

The admin settings page now ships with a dedicated debugger that captures every fetch attempt, response, and state change triggered by `useSettings`. It is designed to surface the root cause of the “settings page not loading” issue quickly without editing production logs or code.

### Enabling the Debugger

- **Development builds**: the debugger auto-enables and starts logging to the browser console.
- **Other builds**: append `?debugSettings=1` to the URL (for example, `/settings?debugSettings=1`) or call `settingsDebugger.setEnabled(true)` from the console. The flag persists in `localStorage` until you disable it.

To disable the instrumentation, run `settingsDebugger.setEnabled(false)` or remove the query flag and clear the `settings-debugger-enabled` entry in `localStorage`.

> The debugger object is exposed globally as `window.settingsDebugger` for manual control.

### Reading Console Output

When enabled, the debugger emits structured console messages prefixed with `[settings-debugger][scope]`. Key scopes include:

- `fetch`: lifecycle of each request (start/success/failure) and whether axios or the unauthenticated fetch fallback was used.
- `network`: raw HTTP status details for completed requests.
- `hook`: state transitions and error messages captured inside `useSettings`.
- `auth`: changes in the authenticated axios client / Clerk token availability.
- `update`: payloads submitted during `updateSettings` mutations.

Console logging remains active even in forced (non-dev) sessions so that you can trace failures in staging environments.

### Capturing and Sharing Diagnostics

1. Enable the debugger and refresh the settings page to capture the full loading sequence.
2. In the browser console, run `settingsDebugger.getState()` to inspect the snapshot:
   - fetch attempt counts, last HTTP status, duration, and timestamps
   - whether `skipAuth` is active and if the axios client exists
   - the latest error message recorded by `useSettings`
3. To copy the most recent history for Slack/Jira, execute:
   ```js
   navigator.clipboard.writeText(JSON.stringify({
     snapshot: settingsDebugger.getState().snapshot,
     insights: settingsDebugger.getState().insights,
     events: settingsDebugger.getState().events.slice(-50),
   }, null, 2))
   ```

### Typical Failure Signals

- **Missing Auth Token**: Look for `scope: auth` warnings indicating the axios client never initialized (`hasApiClient: false`).
- **Endpoint Errors**: Repeated `fetch` errors with HTTP status codes (`lastFetchStatus`) suggest backend routing or permissions issues.
- **Unexpected Payloads**: Events highlighting `success=false` payloads often point to validation errors or DTO mismatches.
- **Silent Failures**: If the console stops at “Starting frontend settings request” with no network response, inspect the browser network tab for CORS or TLS errors.

Armed with these signals, you can zero in on the root cause (authentication, endpoint availability, or data validation) without further instrumentation.
