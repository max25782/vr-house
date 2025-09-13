# VR Error Boundary System

The VR Error Boundary system provides comprehensive error handling and recovery for VR-related crashes in the panorama viewer application.

## Components

### VRErrorBoundary

The core error boundary component that catches and handles VR-related React errors.

**Features:**
- Catches VR-related React errors
- Categorizes errors by type (permission, plugin, timeout, compatibility)
- Provides graceful fallback UI
- Offers retry mechanisms with configurable limits
- Integrates with error reporting service
- Supports automatic error recovery

**Usage:**
```tsx
import { VRErrorBoundary } from './VRErrorBoundary'

<VRErrorBoundary
  maxRetries={3}
  showErrorDetails={process.env.NODE_ENV === 'development'}
  onError={(error, errorInfo, vrError) => {
    console.log('VR Error caught:', vrError)
  }}
>
  <YourVRComponent />
</VRErrorBoundary>
```

**Props:**
- `children`: ReactNode - Components to protect
- `fallback?`: ReactNode - Custom fallback UI
- `onError?`: Function - Error callback
- `maxRetries?`: number - Maximum retry attempts (default: 3)
- `showErrorDetails?`: boolean - Show technical details (default: false)

### VRPanoramaErrorBoundary

Specialized error boundary for panorama viewers with VR functionality.

**Features:**
- VR-specific error handling and recovery
- Option to disable VR and continue with regular panorama viewing
- Panorama-specific error messages and recovery options
- Integration with VRManager error reporting

**Usage:**
```tsx
import VRPanoramaErrorBoundary from './VRPanoramaErrorBoundary'

<VRPanoramaErrorBoundary
  panoramaType="cube"
  panoramaSource="/path/to/panorama"
  onVRDisabled={() => console.log('VR disabled')}
  onPanoramaReload={() => console.log('Panorama reload requested')}
>
  <CubePanoramaViewer />
</VRPanoramaErrorBoundary>
```

**Props:**
- `children`: ReactNode - Panorama viewer component
- `panoramaType?`: 'regular' | 'cube' - Type of panorama
- `panoramaSource?`: string - Path to panorama source
- `onVRDisabled?`: Function - Called when VR is disabled due to errors
- `onPanoramaReload?`: Function - Called when panorama reload is requested

### GlobalVRErrorBoundary

Application-level error boundary for catching VR errors that escape component-level boundaries.

**Features:**
- Catches VR errors that escape component-level boundaries
- Provides application-level error reporting
- Tracks error frequency for debugging
- Offers global recovery options
- Handles unhandled promise rejections and global errors

**Usage:**
```tsx
import GlobalVRErrorBoundary from './GlobalVRErrorBoundary'

// In your app layout or root component
<GlobalVRErrorBoundary>
  <YourApp />
</GlobalVRErrorBoundary>
```

### withVRErrorBoundary

Higher-order component that wraps any component with VRErrorBoundary.

**Usage:**
```tsx
import { withVRErrorBoundary } from './withVRErrorBoundary'

const SafeComponent = withVRErrorBoundary(YourComponent, {
  maxRetries: 3,
  showErrorDetails: process.env.NODE_ENV === 'development'
})
```

## Safe Wrapper Components

### SafePanoramaViewer

PanoramaViewer wrapped with VRPanoramaErrorBoundary for crash protection.

**Usage:**
```tsx
import SafePanoramaViewer from './SafePanoramaViewer'

<SafePanoramaViewer 
  src="/path/to/panorama.jpg"
  initialFov={65}
  showErrorDetails={process.env.NODE_ENV === 'development'}
/>
```

### SafeCubePanoramaViewer

CubePanoramaViewer wrapped with VRPanoramaErrorBoundary for crash protection.

**Usage:**
```tsx
import SafeCubePanoramaViewer from './SafeCubePanoramaViewer'

<SafeCubePanoramaViewer 
  basePath="/path/to/cube/faces"
  files={{ r: 'r.jpg', l: 'l.jpg', u: 'u.jpg', d: 'd.jpg', f: 'f.jpg', b: 'b.jpg' }}
  initialFov={65}
  showErrorDetails={process.env.NODE_ENV === 'development'}
/>
```

## Error Reporting and Recovery Services

### VRErrorReporter

Centralized error reporting service for VR-related errors.

**Features:**
- Centralized error collection and reporting
- Breadcrumb tracking for debugging context
- Local storage for offline error queuing
- Configurable reporting endpoints
- Error deduplication and rate limiting

**Usage:**
```tsx
import { vrErrorReporter } from '../lib/vr/VRErrorReporter'

// Add breadcrumb
vrErrorReporter.addBreadcrumb({
  category: 'user_action',
  message: 'User clicked VR button',
  data: { buttonId: 'vr-toggle' }
})

// Report error
vrErrorReporter.reportError(vrError, { additionalContext: 'value' })
```

### VRErrorRecovery

Automated and manual recovery strategies for VR errors.

**Features:**
- Automated recovery strategies based on error type
- Manual recovery options for user intervention
- Recovery success tracking and learning
- Fallback mode management

**Usage:**
```tsx
import { vrErrorRecovery } from '../lib/vr/VRErrorRecovery'

// Attempt recovery
const result = await vrErrorRecovery.attemptRecovery(vrError)
if (result.success) {
  console.log('Recovery successful:', result.message)
} else {
  console.log('Recovery failed:', result.message)
}
```

## Error Categories and Recovery Strategies

### Permission Errors
- **Category**: `permission`
- **Severity**: `high`
- **Recovery Strategy**: `reset_permissions`
- **User Message**: "Необходимо разрешение на использование гироскопа для VR-режима"

### Plugin Errors
- **Category**: `plugin`
- **Severity**: `high`
- **Recovery Strategy**: `reinitialize_plugin`
- **User Message**: "Ошибка инициализации VR-плагина"

### Timeout Errors
- **Category**: `timeout`
- **Severity**: `medium`
- **Recovery Strategy**: `retry`
- **User Message**: "Превышено время ожидания активации VR-режима"

### Compatibility Errors
- **Category**: `compatibility`
- **Severity**: `low`
- **Recovery Strategy**: `fallback_mode`
- **User Message**: "VR-режим не поддерживается в данном браузере"

## Best Practices

### 1. Use Appropriate Error Boundaries
- Use `VRPanoramaErrorBoundary` for panorama viewers
- Use `VRErrorBoundary` for general VR components
- Use `GlobalVRErrorBoundary` at the application level

### 2. Configure Error Reporting
```tsx
// Configure error reporter with your service
const errorReporter = new VRErrorReporter({
  apiEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY,
  enableConsoleLogging: process.env.NODE_ENV === 'development'
})
```

### 3. Add Breadcrumbs for Context
```tsx
// Add breadcrumbs before critical operations
vrErrorReporter.addBreadcrumb({
  category: 'vr_state',
  message: 'Attempting VR activation',
  data: { vrState: 'requesting' }
})
```

### 4. Handle Recovery Results
```tsx
const handleRetry = async () => {
  const result = await vrErrorRecovery.attemptRecovery(vrError)
  
  switch (result.nextAction) {
    case 'retry':
      // Retry the operation
      break
    case 'fallback':
      // Switch to fallback mode
      break
    case 'user_intervention':
      // Show user intervention UI
      break
  }
}
```

### 5. Monitor Error Statistics
```tsx
// Get error statistics for monitoring
const stats = vrErrorRecovery.getRecoveryStats()
console.log('Recovery stats:', stats)

const reporterStats = vrErrorReporter.getErrorStats()
console.log('Error stats:', reporterStats)
```

## Testing

The error boundary system includes comprehensive tests:

- `VRErrorBoundary.test.tsx` - Tests for core error boundary functionality
- `VRErrorRecovery.test.ts` - Tests for error recovery service

Run tests with:
```bash
npm test VRErrorBoundary
npm test VRErrorRecovery
```

## Integration with Application

The error boundary system is integrated into the application through:

1. **Safe wrapper components** used in VR pages
2. **Global error boundary** (can be added to app layout)
3. **Error reporting service** integrated with VR components
4. **Recovery service** used by error boundaries for automatic recovery

This provides comprehensive protection against VR-related crashes while maintaining a good user experience through graceful error handling and recovery options.