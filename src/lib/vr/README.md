# VR Error Handling System

This comprehensive error handling system provides robust error categorization, automatic recovery mechanisms, and detailed logging for VR functionality debugging.

## Components

### VRErrorHandler

Handles error categorization, recovery strategies, and automatic retry logic.

```typescript
import { VRErrorHandler } from './VRErrorHandler'

const errorHandler = new VRErrorHandler({
  maxRetries: 3,
  retryDelay: 1000,
  enableDetailedLogging: true,
  onError: (error) => console.log('Error occurred:', error),
  onRecovery: (strategy, success) => console.log(`Recovery ${strategy}: ${success}`)
})

// Create categorized errors
const error = errorHandler.createError(
  'permission', 
  'iOS gyroscope permission denied',
  originalError,
  { platform: 'iOS', userAgent: navigator.userAgent }
)

// Handle error with automatic recovery
const recovered = await errorHandler.handleError(error, {
  vrManager: vrManagerInstance,
  retryCallback: () => retryOperation(),
  reinitializeCallback: () => reinitializePlugins()
})
```

### VRLogger

Provides structured logging with different levels and context tracking.

```typescript
import { VRLogger } from './VRLogger'

const logger = new VRLogger({
  enableConsoleOutput: true,
  enableStorage: true,
  maxStoredEntries: 1000,
  logLevel: 'info',
  includeStackTrace: true
})

// Set global context
logger.setContext({ sessionId: 'vr-session-123', userId: 'user-456' })

// Log with different levels
logger.debug('VRActivation', 'Starting VR activation process')
logger.info('VRActivation', 'VR mode activated successfully')
logger.warn('VRActivation', 'Fullscreen API not available')
logger.error('VRActivation', 'VR activation failed', { error: errorObject })

// Specialized logging methods
logger.logSessionStart('session-123', navigator.userAgent, { device: 'iPhone' })
logger.logPerformance('VR', 'activation', 1500, { success: true })
logger.logUserInteraction('click', 'vr-button', { position: { x: 100, y: 200 } })
logger.logCompatibilityInfo('WebXR', true, { version: '1.0' })
```

### VRManager Integration

The VRManager automatically integrates both error handling and logging systems.

```typescript
import { VRManager } from './VRManager'

const vrManager = new VRManager({
  viewer: photoSphereViewer,
  container: containerElement,
  onStateChange: (state) => updateUI(state),
  stereoPlugin: StereoPlugin,
  gyroscopePlugin: GyroscopePlugin
})

// Access error handler and logger
const errorHandler = vrManager.getErrorHandler()
const logger = vrManager.getLogger()

// Get diagnostic information
const diagnostics = vrManager.exportDiagnostics()
console.log('VR Diagnostics:', diagnostics)

// Get error statistics
const errorStats = vrManager.getErrorStats()
console.log('Error Statistics:', errorStats)

// Get recent logs for debugging
const recentLogs = vrManager.getRecentLogs(5) // Last 5 minutes
console.log('Recent Logs:', recentLogs)
```

## Error Categories

### Permission Errors
- **Severity**: Medium
- **Recovery Strategy**: Reset permissions and request again
- **Common Causes**: iOS gyroscope permission denied, secure context required
- **User Message**: "VR mode requires device permissions. Please allow access to device orientation when prompted."

### Plugin Errors
- **Severity**: High
- **Recovery Strategy**: Reinitialize plugin
- **Common Causes**: Photo Sphere Viewer plugin failures, missing plugin methods
- **User Message**: "VR functionality is temporarily unavailable. Please try again in a moment."

### Timeout Errors
- **Severity**: Medium
- **Recovery Strategy**: Retry operation
- **Common Causes**: VR activation taking too long, permission request timeout
- **User Message**: "VR activation is taking longer than expected. Please try again."

### Compatibility Errors
- **Severity**: Low
- **Recovery Strategy**: Enable fallback mode
- **Common Causes**: Browser doesn't support required APIs, device limitations
- **User Message**: "VR mode is not fully supported on this device or browser. Some features may be limited."

## Recovery Strategies

### Automatic Retry
- Retries the original operation after a delay
- Respects maximum retry attempts (default: 3)
- Exponential backoff can be implemented

### Permission Reset
- Clears cached permission status
- Requests permissions again
- Useful for iOS permission issues

### Plugin Reinitialization
- Attempts to reinitialize VR plugins
- Checks plugin availability after reinitialization
- Handles Photo Sphere Viewer plugin lifecycle

### Fallback Mode
- Enables VR functionality without problematic features
- Graceful degradation for unsupported browsers
- Maintains core functionality

### User Intervention
- Requests manual user action
- Shows dialog with recovery instructions
- Allows user to retry or cancel

## Logging Levels

### Debug
- Detailed information for debugging
- Plugin state changes, API calls
- Only logged when logLevel is 'debug'

### Info
- General information about VR operations
- Session start/end, successful activations
- Default minimum log level

### Warn
- Potential issues that don't prevent operation
- Missing optional features, fallback usage
- Includes stack trace when enabled

### Error
- Actual errors that prevent normal operation
- Failed activations, permission denials
- Always includes stack trace when enabled

## Usage Examples

### Basic Error Handling
```typescript
try {
  await vrManager.activateVR()
} catch (error) {
  // Error is automatically handled by VRManager
  // User-friendly message is shown in UI
  console.log('VR activation failed:', error.userMessage)
}
```

### Custom Error Recovery
```typescript
const errorHandler = vrManager.getErrorHandler()

// Handle specific error with custom recovery
const customError = errorHandler.createError(
  'plugin',
  'Custom plugin error',
  originalError,
  { customContext: 'value' }
)

const recovered = await errorHandler.handleError(customError, {
  reinitializeCallback: async () => {
    // Custom plugin reinitialization logic
    await customPluginReinit()
  }
})
```

### Debugging with Logs
```typescript
const logger = vrManager.getLogger()

// Search for specific issues
const errorLogs = logger.getLogsByLevel('error')
const vrActivationLogs = logger.searchLogs('VR activation')
const recentIssues = logger.getRecentLogs(10)

// Export logs for support
const logExport = logger.exportLogs()
// Send logExport to support team
```

### Performance Monitoring
```typescript
const logger = vrManager.getLogger()

const startTime = Date.now()
try {
  await vrManager.activateVR()
  const duration = Date.now() - startTime
  logger.logPerformance('VR', 'activation', duration, { success: true })
} catch (error) {
  const duration = Date.now() - startTime
  logger.logPerformance('VR', 'activation', duration, { success: false, error: error.message })
}
```

## Testing

The error handling system includes comprehensive tests:

```bash
# Run the test suite
npx tsx src/lib/vr/__tests__/test-runner.ts
```

Tests cover:
- Error creation and categorization
- Recovery mechanism execution
- Logging functionality and filtering
- Statistics and diagnostic information
- Integration with VRManager

## Best Practices

1. **Always use categorized errors** - Use the appropriate error category for proper recovery strategy selection
2. **Include context** - Provide relevant context information for better debugging
3. **Monitor error statistics** - Regularly check error patterns to identify systemic issues
4. **Use appropriate log levels** - Don't spam with debug logs in production
5. **Export diagnostics for support** - Use the diagnostic export feature for user support
6. **Test error scenarios** - Verify error handling works in different failure conditions
7. **Implement graceful degradation** - Always provide fallback functionality when possible