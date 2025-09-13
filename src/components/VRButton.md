# VRButton Component

A reusable, accessible VR activation button component that integrates with the VRManager system to provide a consistent VR experience across panorama viewers.

## Features

- **State Management**: Automatically updates appearance based on VR state (idle, loading, active, error)
- **Visual Feedback**: Loading spinners, state-specific colors, and smooth transitions
- **Accessibility**: Full ARIA support, keyboard navigation, and screen reader compatibility
- **Responsive Design**: Multiple sizes and positioning options
- **Customizable**: Extensive styling options and configuration props
- **Error Handling**: Graceful error display and recovery

## Basic Usage

```tsx
import VRButton from './VRButton'
import { useVRManager } from '../hooks/useVRManager'

const PanoramaViewer = ({ viewer, container }) => {
  const { vrManager } = useVRManager({
    viewer,
    container,
    stereoPlugin: StereoPlugin,
    gyroscopePlugin: GyroscopePlugin
  })

  return (
    <div className="relative">
      <div ref={containerRef} className="h-screen w-full">
        {/* Panorama content */}
      </div>
      
      {vrManager && (
        <VRButton vrManager={vrManager} />
      )}
    </div>
  )
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `vrManager` | `VRManager` | The VRManager instance that handles VR functionality |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes to apply |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size variant |
| `position` | `'fixed' \| 'relative'` | `'fixed'` | Button positioning |
| `showLabel` | `boolean` | `true` | Whether to show text label |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `onStateChange` | `(state: VRButtonState) => void` | `undefined` | Callback for state changes |

## Button States

The VRButton automatically updates its appearance based on the VR state:

### Idle State
- **Appearance**: Blue background with "Enter VR" text
- **Behavior**: Clickable, will attempt to activate VR
- **Icon**: VR headset icon

### Loading State
- **Appearance**: Lighter blue background with "Loading..." text
- **Behavior**: Disabled, shows loading spinner
- **Icon**: Animated spinner

### Active State
- **Appearance**: Green background with "Exit VR" text
- **Behavior**: Clickable, will deactivate VR
- **Icon**: VR headset icon
- **ARIA**: `aria-pressed="true"`

### Error State
- **Appearance**: Red background with "VR Error" text
- **Behavior**: Clickable, will attempt to retry VR activation
- **Icon**: Warning triangle icon

### Disabled State
- **Appearance**: Gray background, no hover effects
- **Behavior**: Not clickable
- **Icon**: VR headset icon (dimmed)

## Size Variants

### Small
```tsx
<VRButton vrManager={vrManager} size="small" />
```
- Padding: `px-4 py-2`
- Text: `text-sm`
- Icon: `h-4 w-4`

### Medium (Default)
```tsx
<VRButton vrManager={vrManager} size="medium" />
```
- Padding: `px-6 py-3`
- Text: `text-lg`
- Icon: `h-6 w-6`

### Large
```tsx
<VRButton vrManager={vrManager} size="large" />
```
- Padding: `px-8 py-4`
- Text: `text-xl`
- Icon: `h-8 w-8`

## Positioning

### Fixed (Default)
```tsx
<VRButton vrManager={vrManager} position="fixed" />
```
- Positioned fixed in bottom-right corner
- High z-index for overlay display
- Ideal for panorama viewers

### Relative
```tsx
<VRButton vrManager={vrManager} position="relative" />
```
- Positioned relative to parent container
- Useful for inline placement or custom layouts

## Customization Examples

### Icon-Only Button
```tsx
<VRButton 
  vrManager={vrManager} 
  showLabel={false}
  className="!w-12 !h-12 !p-0 !rounded-lg"
/>
```

### Custom Styling
```tsx
<VRButton 
  vrManager={vrManager}
  className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg"
/>
```

### Minimal Style
```tsx
<VRButton 
  vrManager={vrManager}
  className="!bg-transparent !text-blue-600 border-2 border-blue-600 hover:!bg-blue-600 hover:!text-white !shadow-none"
/>
```

## Accessibility Features

The VRButton includes comprehensive accessibility support:

### ARIA Attributes
- `aria-label`: Descriptive label that updates with state
- `aria-pressed`: Indicates active/inactive state
- `role="button"`: Semantic button role
- `title`: Tooltip text for additional context

### Keyboard Support
- Fully keyboard navigable
- Focus indicators with high contrast rings
- Standard button activation (Space/Enter)

### Screen Reader Support
- State changes are announced
- Error messages are communicated
- Loading states are indicated

### Visual Accessibility
- High contrast focus rings
- Clear state differentiation through color and text
- Sufficient color contrast ratios
- Smooth transitions that respect `prefers-reduced-motion`

## State Change Callback

Monitor VR state changes for custom logic:

```tsx
<VRButton 
  vrManager={vrManager}
  onStateChange={(state) => {
    console.log('VR State:', state.vrStatus)
    console.log('Is Loading:', state.isLoading)
    console.log('Is Active:', state.isActive)
    console.log('Error:', state.error)
    
    // Custom logic based on state
    if (state.isActive) {
      // VR mode activated
      hideOtherUI()
    } else if (state.error) {
      // Handle error
      showErrorNotification(state.error)
    }
  }}
/>
```

## Integration with useVRManager Hook

The `useVRManager` hook simplifies VRButton integration:

```tsx
import { useVRManager } from '../hooks/useVRManager'
import VRButton from './VRButton'

const MyPanoramaComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState(null)

  const { vrManager, vrState, isReady, error } = useVRManager({
    viewer,
    container: containerRef.current,
    stereoPlugin: StereoPlugin,
    gyroscopePlugin: GyroscopePlugin,
    onStateChange: (state) => {
      console.log('VR state changed:', state)
    }
  })

  return (
    <div className="relative">
      <div ref={containerRef} className="h-screen w-full">
        {/* Panorama viewer content */}
      </div>
      
      {isReady && vrManager && (
        <VRButton vrManager={vrManager} />
      )}
      
      {error && (
        <div className="error">VR Manager Error: {error}</div>
      )}
    </div>
  )
}
```

## Error Handling

The VRButton handles errors gracefully:

1. **Permission Errors**: Shows clear message about gyroscope permissions
2. **Plugin Errors**: Indicates VR plugin issues
3. **Timeout Errors**: Handles activation timeouts
4. **Compatibility Errors**: Shows browser compatibility issues

Errors are logged to console and displayed to users through:
- Button state changes (red background)
- Updated ARIA labels
- Error text in button
- Optional error callbacks

## Browser Compatibility

The VRButton works across all browsers supported by the VRManager:

- **iOS Safari**: Full support with gyroscope permission handling
- **Android Chrome**: WebXR and fallback support
- **Desktop Browsers**: Basic VR functionality
- **Unsupported Browsers**: Graceful degradation

## Testing

The component includes comprehensive tests covering:

- Rendering with different props
- State management and updates
- User interactions and click handling
- Accessibility features
- Error handling
- Visual state changes

Run tests with:
```bash
npm test VRButton
```

## Performance Considerations

- Minimal re-renders through optimized state management
- Efficient event handling with useCallback
- Lightweight DOM structure
- CSS transitions for smooth animations
- Proper cleanup on unmount

## Migration from Legacy VR Buttons

To migrate from existing VR button implementations:

1. Replace inline VR activation logic with VRManager
2. Replace custom button with VRButton component
3. Update event handlers to use VRManager methods
4. Remove duplicate permission handling code
5. Update styling to use VRButton props

### Before (Legacy)
```tsx
const activateVR = async () => {
  // Complex VR activation logic
  // Permission handling
  // Error handling
  // State management
}

<button onClick={activateVR} className="vr-button">
  Enter VR
</button>
```

### After (VRButton)
```tsx
const { vrManager } = useVRManager({ viewer, container })

<VRButton vrManager={vrManager} />
```

## Contributing

When contributing to the VRButton component:

1. Maintain accessibility standards
2. Add tests for new features
3. Update documentation
4. Follow existing code patterns
5. Test across different browsers and devices

## Related Components

- `VRManager`: Core VR state management
- `useVRManager`: React hook for VR integration
- `VRErrorBoundary`: Error boundary for VR components
- `PanoramaViewer`: Main panorama component
- `CubePanoramaViewer`: Cube panorama component