# Design Document

## Overview

The VR crash fix addresses stability issues in the 360-degree panorama viewer by implementing a robust, single-responsibility VR activation system. The current implementation suffers from multiple event handlers, race conditions, and complex nested try-catch blocks that lead to crashes. The new design will use a centralized VR manager with proper state management, simplified event handling, and defensive programming practices.

## Architecture

### Current Issues Analysis
- Multiple overlapping event listeners for VR activation
- Complex nested async operations without proper error boundaries
- Race conditions between gyroscope permission requests and VR activation
- Inconsistent state management between cube and regular panorama viewers
- Timeout mechanisms that don't properly clean up resources

### Proposed Architecture
```
VRManager (Singleton)
├── State Management
│   ├── VR Status (idle, requesting, active, error)
│   ├── Permission Status (unknown, granted, denied)
│   └── Plugin References
├── Event Handling
│   ├── Single Click Handler
│   ├── Permission Request Handler
│   └── Error Recovery Handler
└── Resource Management
    ├── Cleanup on Component Unmount
    ├── Timeout Management
    └── Plugin Lifecycle
```

## Components and Interfaces

### VRManager Class
```typescript
interface VRState {
  status: 'idle' | 'requesting' | 'active' | 'error'
  permissionStatus: 'unknown' | 'granted' | 'denied'
  error?: string
}

interface VRManagerConfig {
  viewer: Viewer
  container: HTMLElement
  onStateChange: (state: VRState) => void
}

class VRManager {
  private state: VRState
  private config: VRManagerConfig
  private timeouts: Set<NodeJS.Timeout>
  
  constructor(config: VRManagerConfig)
  activateVR(): Promise<void>
  deactivateVR(): Promise<void>
  requestPermissions(): Promise<boolean>
  cleanup(): void
}
```

### Enhanced Panorama Components
Both `PanoramaViewer` and `CubePanoramaViewer` will be refactored to:
- Use the centralized VRManager
- Remove duplicate VR activation logic
- Implement consistent error handling
- Share common VR button component

### VR Button Component
```typescript
interface VRButtonProps {
  vrManager: VRManager
  className?: string
}

interface VRButtonState {
  isLoading: boolean
  isActive: boolean
  error?: string
}
```

## Data Models

### VR State Machine
```
idle → requesting → active
  ↓       ↓         ↓
error ← error ← error
  ↓
idle (after timeout/user action)
```

### Permission Flow
```
unknown → requesting → granted/denied
```

## Error Handling

### Error Categories
1. **Permission Errors**: iOS gyroscope permission denied
2. **Plugin Errors**: Photo Sphere Viewer plugin failures
3. **Timeout Errors**: VR activation taking too long
4. **Browser Compatibility**: WebXR or fullscreen API unavailable

### Error Recovery Strategy
- Graceful degradation for unsupported features
- Clear user messaging for permission issues
- Automatic retry mechanisms for transient failures
- Fallback to non-VR mode when VR fails

### Error Boundaries
```typescript
interface ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void
  render(): ReactNode
}
```

## Testing Strategy

### Unit Tests
- VRManager state transitions
- Permission request handling
- Error recovery mechanisms
- Timeout cleanup

### Integration Tests
- VR activation flow end-to-end
- iOS permission request flow
- Plugin initialization and cleanup
- Component unmounting scenarios

### Manual Testing Scenarios
1. **iOS Safari**: Gyroscope permission flow
2. **Android Chrome**: WebXR compatibility
3. **Desktop**: Fallback behavior
4. **Network Issues**: Panorama loading failures
5. **Rapid Clicking**: Race condition prevention

### Performance Tests
- Memory leak detection during VR mode
- Event listener cleanup verification
- Plugin resource management
- Timeout mechanism efficiency

## Implementation Phases

### Phase 1: VRManager Implementation
- Create centralized VR management class
- Implement state machine and error handling
- Add comprehensive logging and debugging

### Phase 2: Component Refactoring
- Refactor PanoramaViewer to use VRManager
- Refactor CubePanoramaViewer to use VRManager
- Remove duplicate VR activation code

### Phase 3: Enhanced VR Button
- Create reusable VR button component
- Add loading states and visual feedback
- Implement consistent styling

### Phase 4: Error Handling & Recovery
- Add error boundaries around VR components
- Implement graceful degradation
- Add user-friendly error messages

### Phase 5: Testing & Optimization
- Comprehensive test coverage
- Performance optimization
- Cross-browser compatibility testing