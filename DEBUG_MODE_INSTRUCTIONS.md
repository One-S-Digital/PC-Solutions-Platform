# Debug Mode Instructions

## How to Enable Debug Mode

The frontend now includes a persistent debug logging system that survives page reloads. Here's how to use it:

### 1. Enable Debug Mode

Open your browser's developer console and run:

```javascript
localStorage.setItem('debug-enabled', 'true');
```

Then refresh the page. You should see a red bug icon in the bottom-right corner.

### 2. View Debug Logs

Click the red bug icon to open the debug panel. The panel shows:

- **All Logs**: Complete log history across page reloads
- **Filter by Category**: Filter logs by SIGNUP, VERIFICATION, LOGIN, AUTH, etc.
- **Auto Refresh**: Automatically updates logs every second
- **Clear Logs**: Clear all stored logs
- **Real-time Updates**: Logs update as events happen

### 3. Debug Categories

The system logs different types of events:

- **SIGNUP**: Signup process events
- **VERIFICATION**: Email verification events  
- **LOGIN**: Login page state changes
- **AUTH**: Authentication state changes
- **NAVIGATION**: Page navigation events
- **LIFECYCLE**: Component mount/unmount events
- **FORM**: Form interactions

### 4. Console Commands

You can also use these commands in the browser console:

```javascript
// View all logs
debugLogger.displayAllLogs();

// View logs by category
debugLogger.displayLogsByCategory('SIGNUP');

// Get raw log data
debugLogger.getLogs();

// Clear all logs
debugLogger.clearLogs();
```

### 5. Disable Debug Mode

To disable debug mode:

```javascript
localStorage.removeItem('debug-enabled');
```

Then refresh the page.

## What This Helps Debug

This debug system will help you track:

1. **Signup Flow**: Complete signup process from start to finish
2. **Email Verification**: What happens during verification
3. **Page Reloads**: Why the page reloads and what state is lost
4. **Authentication State**: How auth state changes over time
5. **Navigation**: Page transitions and routing
6. **Form Interactions**: User input and form submissions

## For Production

The debug panel only appears when:
- `NODE_ENV === 'development'` OR
- `localStorage.getItem('debug-enabled') === 'true'`

This ensures it doesn't appear for regular users in production.