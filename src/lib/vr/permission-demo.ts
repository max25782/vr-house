/**
 * Permission Handling System Demo
 * Demonstrates the enhanced permission handling capabilities
 */

import { VRManager } from './VRManager'
import { VRManagerConfig } from './types'

/**
 * Demo function showing how to use the enhanced permission handling system
 */
export async function demonstratePermissionHandling() {
  // Mock configuration for demonstration
  const mockConfig: VRManagerConfig = {
    viewer: {
      getPlugin: (name: string) => ({
        toggle: () => console.log(`${name} toggled`),
        start: () => console.log(`${name} started`),
        stop: () => console.log(`${name} stopped`),
        isEnabled: () => false
      })
    },
    container: document.createElement('div'),
    onStateChange: (state) => {
      console.log('VR State changed:', state)
    },
    stereoPlugin: 'StereoPlugin',
    gyroscopePlugin: 'GyroscopePlugin'
  }

  const vrManager = new VRManager(mockConfig)

  console.log('=== VR Permission Handling Demo ===')

  // 1. Check device type
  console.log('\n1. Device Detection:')
  const isIOS = vrManager.detectIOSDevice()
  console.log(`iOS Device: ${isIOS}`)
  console.log(`Permissions Required: ${vrManager.arePermissionsRequired()}`)

  // 2. Check initial permission status
  console.log('\n2. Initial Permission Status:')
  console.log(`Permission Status: ${vrManager.getPermissionStatus()}`)

  // 3. Request permissions (this will be cached after first request)
  console.log('\n3. Requesting Permissions:')
  try {
    const granted = await vrManager.requestPermissions()
    console.log(`Permission Granted: ${granted}`)
    console.log(`Cached Permission Status: ${vrManager.getPermissionStatus()}`)
  } catch (error) {
    console.error('Permission request failed:', error)
  }

  // 4. Demonstrate caching - second request should use cached result
  console.log('\n4. Testing Permission Caching:')
  try {
    const grantedCached = await vrManager.requestPermissions()
    console.log(`Cached Permission Result: ${grantedCached}`)
  } catch (error) {
    console.error('Cached permission request failed:', error)
  }

  // 5. Reset and try again
  console.log('\n5. Resetting Permission Status:')
  vrManager.resetPermissionStatus()
  console.log(`Reset Permission Status: ${vrManager.getPermissionStatus()}`)

  // 6. Clean up
  vrManager.cleanup()
  console.log('\n6. VRManager cleaned up')

  return vrManager
}

/**
 * Specific iOS permission handling demo
 */
export function demonstrateIOSPermissionHandling() {
  console.log('\n=== iOS Permission Handling Features ===')
  
  // Mock iOS environment
  const originalUserAgent = navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    configurable: true
  })

  // Mock DeviceOrientationEvent with requestPermission
  const mockDeviceOrientationEvent = {
    requestPermission: async () => {
      console.log('iOS permission dialog would appear here')
      // Simulate user granting permission
      return 'granted'
    }
  }

  // @ts-ignore - For demo purposes
  global.DeviceOrientationEvent = mockDeviceOrientationEvent

  const mockConfig: VRManagerConfig = {
    viewer: { getPlugin: () => null },
    container: document.createElement('div'),
    onStateChange: (state) => console.log('iOS VR State:', state)
  }

  const vrManager = new VRManager(mockConfig)

  console.log('iOS Device Detection:', vrManager.detectIOSDevice())
  console.log('Permissions Required:', vrManager.arePermissionsRequired())

  // Restore original user agent
  Object.defineProperty(navigator, 'userAgent', {
    value: originalUserAgent,
    configurable: true
  })

  return vrManager
}

/**
 * Non-iOS fallback behavior demo
 */
export function demonstrateNonIOSFallback() {
  console.log('\n=== Non-iOS Fallback Behavior ===')
  
  // Mock Android environment
  const originalUserAgent = navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
    configurable: true
  })

  const mockConfig: VRManagerConfig = {
    viewer: { getPlugin: () => null },
    container: document.createElement('div'),
    onStateChange: (state) => console.log('Android VR State:', state)
  }

  const vrManager = new VRManager(mockConfig)

  console.log('Android Device Detection:', !vrManager.detectIOSDevice())
  console.log('Permissions Required:', vrManager.arePermissionsRequired())
  console.log('Fallback behavior: Permissions automatically granted for non-iOS devices')

  // Restore original user agent
  Object.defineProperty(navigator, 'userAgent', {
    value: originalUserAgent,
    configurable: true
  })

  return vrManager
}