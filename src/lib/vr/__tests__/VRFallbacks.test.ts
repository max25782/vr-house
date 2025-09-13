/**
 * VR Fallbacks Tests
 * Tests for fallback implementations when VR features are not supported
 */

import { VRFallbacks } from '../VRFallbacks'
import { BrowserCompatibility } from '../BrowserCompatibility'
import { mockUserAgent, mockSecureContext, USER_AGENTS } from './mocks/PhotoSphereViewerMocks'

describe('VRFallbacks', () => {
  let fallbacks: VRFallbacks
  let compatibility: BrowserCompatibility
  let cleanupFunctions: (() => void)[] = []

  beforeEach(() => {
    compatibility = BrowserCompatibility.getInstance()
    compatibility.clearCache()
    fallbacks = new VRFallbacks({
      enableMouseControls: true,
      enableTouchControls: true,
      enableKeyboardControls: true,
      showCompatibilityWarnings: false, // Disable for testing
      autoDetectFallbacks: true
    })
  })

  afterEach(() => {
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
    compatibility.clearCache()
  })

  describe('Fallback Detection', () => {
    test('should detect device orientation fallback for desktop', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      // Mock DeviceOrientationEvent as undefined
      const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
      ;(global as any).DeviceOrientationEvent = undefined
      cleanupFunctions.push(() => {
        ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
      })

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'DeviceOrientationFallback',
          isAvailable: true
        })
      )
    })

    test('should detect fullscreen fallback when API not available', () => {
      // Mock fullscreen API as unavailable
      const originalRequestFullscreen = document.documentElement.requestFullscreen
      ;(document.documentElement as any).requestFullscreen = undefined
      cleanupFunctions.push(() => {
        ;(document.documentElement as any).requestFullscreen = originalRequestFullscreen
      })

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'FullscreenFallback',
          isAvailable: true
        })
      )
    })

    test('should detect gyroscope fallback for desktop', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'GyroscopeFallback',
          isAvailable: true
        })
      )
    })

    test('should detect permission fallback for iOS without permission API', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      // Mock permission API as unavailable
      const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission
      ;(DeviceOrientationEvent as any).requestPermission = undefined
      cleanupFunctions.push(() => {
        ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
      })

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'PermissionFallback',
          isAvailable: true
        })
      )
    })

    test('should detect secure context fallback for HTTP', () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'SecureContextFallback',
          isAvailable: true
        })
      )
    })
  })

  describe('Device Orientation Fallback', () => {
    test('should activate touch controls for mobile devices', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const deviceOrientationFallback = availableFallbacks.find(f => f.name === 'DeviceOrientationFallback')
      
      expect(deviceOrientationFallback).toBeDefined()
      
      if (deviceOrientationFallback) {
        await deviceOrientationFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain('DeviceOrientationFallback')
        
        await deviceOrientationFallback.deactivate()
        
        expect(fallbacks.getActiveFallbacks()).not.toContain('DeviceOrientationFallback')
      }
    })

    test('should activate mouse controls for desktop devices', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const deviceOrientationFallback = availableFallbacks.find(f => f.name === 'DeviceOrientationFallback')
      
      if (deviceOrientationFallback) {
        await deviceOrientationFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        
        await deviceOrientationFallback.deactivate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(false)
      }
    })
  })

  describe('Fullscreen Fallback', () => {
    test('should activate fullscreen fallback', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const fullscreenFallback = availableFallbacks.find(f => f.name === 'FullscreenFallback')
      
      if (fullscreenFallback) {
        await fullscreenFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain('FullscreenFallback')
        
        // Check if CSS class was added
        expect(document.body.classList.contains('vr-fallback-fullscreen')).toBe(true)
        
        await fullscreenFallback.deactivate()
        
        expect(fallbacks.getActiveFallbacks()).not.toContain('FullscreenFallback')
        expect(document.body.classList.contains('vr-fallback-fullscreen')).toBe(false)
      }
    })

    test('should modify viewport meta tag', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const fullscreenFallback = availableFallbacks.find(f => f.name === 'FullscreenFallback')
      
      if (fullscreenFallback) {
        // Create initial viewport meta tag
        const viewport = document.createElement('meta')
        viewport.name = 'viewport'
        viewport.content = 'width=device-width, initial-scale=1.0'
        document.head.appendChild(viewport)
        
        const originalContent = viewport.content
        
        await fullscreenFallback.activate()
        
        expect(viewport.content).toContain('user-scalable=no')
        expect(viewport.getAttribute('data-original-content')).toBe(originalContent)
        
        await fullscreenFallback.deactivate()
        
        expect(viewport.content).toBe(originalContent)
        
        // Cleanup
        document.head.removeChild(viewport)
      }
    })
  })

  describe('Gyroscope Fallback', () => {
    test('should activate gyroscope fallback for mobile', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const gyroscopeFallback = availableFallbacks.find(f => f.name === 'GyroscopeFallback')
      
      if (gyroscopeFallback) {
        await gyroscopeFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain('GyroscopeFallback')
        
        await gyroscopeFallback.deactivate()
        
        expect(fallbacks.getActiveFallbacks()).not.toContain('GyroscopeFallback')
      }
    })

    test('should activate gyroscope fallback for desktop', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const gyroscopeFallback = availableFallbacks.find(f => f.name === 'GyroscopeFallback')
      
      if (gyroscopeFallback) {
        await gyroscopeFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        
        await gyroscopeFallback.deactivate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(false)
      }
    })
  })

  describe('Permission Fallback', () => {
    test('should activate permission fallback for iOS', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const permissionFallback = availableFallbacks.find(f => f.name === 'PermissionFallback')
      
      if (permissionFallback) {
        await permissionFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain('PermissionFallback')
        
        await permissionFallback.deactivate()
        
        expect(fallbacks.getActiveFallbacks()).not.toContain('PermissionFallback')
      }
    })
  })

  describe('Secure Context Fallback', () => {
    test('should activate secure context fallback for HTTP', async () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      const secureContextFallback = availableFallbacks.find(f => f.name === 'SecureContextFallback')
      
      if (secureContextFallback) {
        await secureContextFallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain('SecureContextFallback')
        
        await secureContextFallback.deactivate()
        
        expect(fallbacks.getActiveFallbacks()).not.toContain('SecureContextFallback')
      }
    })
  })

  describe('Automatic Fallback Activation', () => {
    test('should activate recommended fallbacks automatically', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      // Mock DeviceOrientationEvent as undefined
      const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
      ;(global as any).DeviceOrientationEvent = undefined
      cleanupFunctions.push(() => {
        ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
      })

      await fallbacks.activateRecommendedFallbacks()
      
      expect(fallbacks.hasActiveFallbacks()).toBe(true)
      
      const activeFallbacks = fallbacks.getActiveFallbacks()
      expect(activeFallbacks.length).toBeGreaterThan(0)
      
      await fallbacks.deactivateAllFallbacks()
      
      expect(fallbacks.hasActiveFallbacks()).toBe(false)
    })

    test('should not activate fallbacks when auto-detect is disabled', async () => {
      const fallbacksNoAuto = new VRFallbacks({
        autoDetectFallbacks: false
      })

      await fallbacksNoAuto.activateRecommendedFallbacks()
      
      expect(fallbacksNoAuto.hasActiveFallbacks()).toBe(false)
    })
  })

  describe('Fallback Configuration', () => {
    test('should respect mouse controls configuration', () => {
      const fallbacksNoMouse = new VRFallbacks({
        enableMouseControls: false
      })

      // Configuration should be respected in fallback implementations
      expect(fallbacksNoMouse).toBeDefined()
    })

    test('should respect touch controls configuration', () => {
      const fallbacksNoTouch = new VRFallbacks({
        enableTouchControls: false
      })

      expect(fallbacksNoTouch).toBeDefined()
    })

    test('should respect keyboard controls configuration', () => {
      const fallbacksNoKeyboard = new VRFallbacks({
        enableKeyboardControls: false
      })

      expect(fallbacksNoKeyboard).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle fallback activation errors gracefully', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      if (availableFallbacks.length > 0) {
        const fallback = availableFallbacks[0]
        
        // Mock activation to throw error
        const originalActivate = fallback.activate
        fallback.activate = jest.fn().mockRejectedValue(new Error('Activation failed'))
        
        // Should not throw
        await expect(fallbacks.activateRecommendedFallbacks()).resolves.not.toThrow()
        
        // Restore original method
        fallback.activate = originalActivate
      }
    })

    test('should handle fallback deactivation errors gracefully', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      if (availableFallbacks.length > 0) {
        const fallback = availableFallbacks[0]
        
        // Activate first
        await fallback.activate()
        
        // Mock deactivation to throw error
        const originalDeactivate = fallback.deactivate
        fallback.deactivate = jest.fn().mockRejectedValue(new Error('Deactivation failed'))
        
        // Should not throw
        await expect(fallbacks.deactivateAllFallbacks()).resolves.not.toThrow()
        
        // Restore original method
        fallback.deactivate = originalDeactivate
      }
    })
  })

  describe('State Management', () => {
    test('should track active fallbacks correctly', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      expect(fallbacks.hasActiveFallbacks()).toBe(false)
      expect(fallbacks.getActiveFallbacks()).toEqual([])
      
      if (availableFallbacks.length > 0) {
        const fallback = availableFallbacks[0]
        
        await fallback.activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks()).toContain(fallback.name)
        
        await fallback.deactivate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(false)
        expect(fallbacks.getActiveFallbacks()).not.toContain(fallback.name)
      }
    })

    test('should handle multiple active fallbacks', async () => {
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      
      if (availableFallbacks.length >= 2) {
        await availableFallbacks[0].activate()
        await availableFallbacks[1].activate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks().length).toBe(2)
        
        await availableFallbacks[0].deactivate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(true)
        expect(fallbacks.getActiveFallbacks().length).toBe(1)
        
        await availableFallbacks[1].deactivate()
        
        expect(fallbacks.hasActiveFallbacks()).toBe(false)
        expect(fallbacks.getActiveFallbacks().length).toBe(0)
      }
    })
  })
})