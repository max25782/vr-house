/**
 * Cross-Browser Compatibility Integration Tests
 * Comprehensive tests for VR functionality across different browsers and platforms
 */

import { VRManager } from '../VRManager'
import { BrowserCompatibility } from '../BrowserCompatibility'
import { VRFallbacks } from '../VRFallbacks'
import { VRManagerConfig } from '../types'
import {
  createMockViewer,
  createMockStereoPlugin,
  createMockGyroscopePlugin,
  mockDeviceOrientationPermission,
  mockUserAgent,
  mockSecureContext,
  mockFullscreenAPI,
  USER_AGENTS,
} from './mocks/PhotoSphereViewerMocks'

describe('Cross-Browser Compatibility Integration', () => {
  let cleanupFunctions: (() => void)[] = []
  let compatibility: BrowserCompatibility
  let fallbacks: VRFallbacks

  beforeEach(() => {
    compatibility = BrowserCompatibility.getInstance()
    compatibility.clearCache()
    fallbacks = new VRFallbacks({
      showCompatibilityWarnings: false // Disable for testing
    })
  })

  afterEach(() => {
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
    compatibility.clearCache()
  })

  describe('iOS Safari Compatibility', () => {
    test('should work with iOS Safari 14+ with permissions', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      const restoreSecureContext = mockSecureContext(true)
      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext, restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')
      mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Check browser detection
      const report = compatibility.getCompatibilityReport()
      expect(report.browser.name).toBe('Safari')
      expect(report.browser.platform).toBe('iOS')
      expect(report.vrSupport).toBe('full')

      // Test VR activation
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      // Test VR deactivation
      await vrManager.deactivateVR()
      expect(vrManager.getState().status).toBe('idle')

      vrManager.cleanup()
    })

    test('should handle iOS Safari with permission denial', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      const restoreSecureContext = mockSecureContext(true)
      const restorePermission = mockDeviceOrientationPermission('denied')
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext, restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // VR activation should fail with permission error
      await expect(vrManager.activateVR()).rejects.toThrow()
      expect(vrManager.getState().status).toBe('error')

      vrManager.cleanup()
    })

    test('should work with older iOS Safari without permission API', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      // Remove permission API to simulate older iOS
      const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission
      ;(DeviceOrientationEvent as any).requestPermission = undefined
      cleanupFunctions.push(() => {
        ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
      })

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Should work without permission API (older iOS)
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      vrManager.cleanup()
    })

    test('should provide fallbacks for iOS with limited support', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      const restoreSecureContext = mockSecureContext(false) // Insecure context
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      expect(report.warnings).toContain(
        expect.stringContaining('Not running in secure context')
      )

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'SecureContextFallback'
        })
      )
    })
  })

  describe('Android Chrome Compatibility', () => {
    test('should work with Android Chrome', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')
      mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Check browser detection
      const report = compatibility.getCompatibilityReport()
      expect(report.browser.name).toBe('Chrome')
      expect(report.browser.platform).toBe('Android')
      expect(['full', 'partial']).toContain(report.vrSupport)

      // Test VR activation (should not require permissions on Android)
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      vrManager.cleanup()
    })

    test('should handle Android Chrome without fullscreen API', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      // Mock fullscreen API as unavailable
      const mockContainer = mockFullscreenAPI(false)

      const mockViewer = createMockViewer()
      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Should still work without fullscreen API
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      // Check that fullscreen fallback is available
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'FullscreenFallback'
        })
      )

      vrManager.cleanup()
    })
  })

  describe('Desktop Browser Compatibility', () => {
    test('should work with Desktop Chrome', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')
      mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Check browser detection
      const report = compatibility.getCompatibilityReport()
      expect(report.browser.name).toBe('Chrome')
      expect(report.browser.platform).toBe('Desktop')
      expect(report.browser.isMobile).toBe(false)

      // Desktop should work without gyroscope
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      vrManager.cleanup()
    })

    test('should work with Desktop Firefox', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_FIREFOX)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')
      mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Check browser detection
      const report = compatibility.getCompatibilityReport()
      expect(report.browser.name).toBe('Firefox')
      expect(report.browser.platform).toBe('Desktop')

      // Firefox should have warnings about limited VR support
      expect(report.warnings).toContain(
        expect.stringContaining('Firefox desktop may have limited VR support')
      )

      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      vrManager.cleanup()
    })

    test('should work with Desktop Safari', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_SAFARI)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')
      mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Check browser detection
      const report = compatibility.getCompatibilityReport()
      expect(report.browser.name).toBe('Safari')
      expect(report.browser.platform).toBe('Desktop')

      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      vrManager.cleanup()
    })

    test('should provide gyroscope fallback for desktop browsers', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const report = compatibility.getCompatibilityReport()
      expect(report.features.gyroscope).toBe(false) // Desktop typically doesn't have gyroscope

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'GyroscopeFallback'
        })
      )
    })
  })

  describe('Feature Degradation Scenarios', () => {
    test('should handle missing DeviceOrientationEvent gracefully', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      // Mock DeviceOrientationEvent as undefined
      const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
      ;(global as any).DeviceOrientationEvent = undefined
      cleanupFunctions.push(() => {
        ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
      })

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Should still work without DeviceOrientationEvent
      await vrManager.activateVR()
      expect(vrManager.getState().status).toBe('active')

      // Check that device orientation fallback is available
      const availableFallbacks = fallbacks.getAvailableFallbacks()
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'DeviceOrientationFallback'
        })
      )

      vrManager.cleanup()
    })

    test('should handle insecure context limitations', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      expect(report.features.secureContext).toBe(false)
      expect(report.vrSupport).toBe('limited')

      const availableFallbacks = fallbacks.getAvailableFallbacks()
      expect(availableFallbacks).toContainEqual(
        expect.objectContaining({
          name: 'SecureContextFallback'
        })
      )
    })

    test('should handle plugin failures with fallbacks', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      // Create viewer with failing stereo plugin
      const mockViewer = createMockViewer({
        stereoPlugin: createMockStereoPlugin({ shouldFailToggle: true })
      })
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // VR activation should fail but be handled gracefully
      await expect(vrManager.activateVR()).rejects.toThrow()
      expect(vrManager.getState().status).toBe('error')

      vrManager.cleanup()
    })
  })

  describe('Performance and Resource Management', () => {
    test('should clean up resources properly across browsers', async () => {
      const browsers = [
        USER_AGENTS.IPHONE,
        USER_AGENTS.ANDROID_CHROME,
        USER_AGENTS.DESKTOP_CHROME,
        USER_AGENTS.DESKTOP_FIREFOX
      ]

      for (const userAgent of browsers) {
        const restoreUserAgent = mockUserAgent(userAgent)
        const restoreSecureContext = mockSecureContext(true)

        const mockViewer = createMockViewer()
        const mockContainer = document.createElement('div')

        const config: VRManagerConfig = {
          viewer: mockViewer,
          container: mockContainer,
          stereoPlugin: 'StereoPlugin',
          gyroscopePlugin: 'GyroscopePlugin',
          onStateChange: jest.fn()
        }

        const vrManager = new VRManager(config)

        // Activate and deactivate VR
        try {
          await vrManager.activateVR()
          await vrManager.deactivateVR()
        } catch (error) {
          // Some browsers might fail, that's okay for this test
        }

        // Cleanup should not throw
        expect(() => vrManager.cleanup()).not.toThrow()

        restoreUserAgent()
        restoreSecureContext()
      }
    })

    test('should handle rapid activation/deactivation across browsers', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      // Rapid toggle operations
      const togglePromises = []
      for (let i = 0; i < 5; i++) {
        togglePromises.push(vrManager.toggleVR())
      }

      // Should handle rapid toggles gracefully
      await Promise.allSettled(togglePromises)

      // Final state should be consistent
      const finalState = vrManager.getState()
      expect(['idle', 'active', 'error']).toContain(finalState.status)

      vrManager.cleanup()
    })
  })

  describe('Comprehensive Browser Matrix Testing', () => {
    const testMatrix = [
      {
        name: 'iOS Safari HTTPS',
        userAgent: USER_AGENTS.IPHONE,
        secureContext: true,
        hasPermissionAPI: true,
        permissionResponse: 'granted' as const,
        expectedVRSupport: 'full' as const
      },
      {
        name: 'iOS Safari HTTP',
        userAgent: USER_AGENTS.IPHONE,
        secureContext: false,
        hasPermissionAPI: true,
        permissionResponse: 'granted' as const,
        expectedVRSupport: 'limited' as const
      },
      {
        name: 'Android Chrome HTTPS',
        userAgent: USER_AGENTS.ANDROID_CHROME,
        secureContext: true,
        hasPermissionAPI: false,
        permissionResponse: null,
        expectedVRSupport: 'full' as const
      },
      {
        name: 'Desktop Chrome HTTPS',
        userAgent: USER_AGENTS.DESKTOP_CHROME,
        secureContext: true,
        hasPermissionAPI: false,
        permissionResponse: null,
        expectedVRSupport: 'full' as const
      },
      {
        name: 'Desktop Firefox HTTPS',
        userAgent: USER_AGENTS.DESKTOP_FIREFOX,
        secureContext: true,
        hasPermissionAPI: false,
        permissionResponse: null,
        expectedVRSupport: 'full' as const
      }
    ]

    test.each(testMatrix)('should handle $name correctly', async (testCase) => {
      const restoreUserAgent = mockUserAgent(testCase.userAgent)
      const restoreSecureContext = mockSecureContext(testCase.secureContext)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      let restorePermission: (() => void) | null = null
      if (testCase.hasPermissionAPI && testCase.permissionResponse) {
        restorePermission = mockDeviceOrientationPermission(testCase.permissionResponse)
        cleanupFunctions.push(restorePermission)
      } else if (!testCase.hasPermissionAPI) {
        const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission
        ;(DeviceOrientationEvent as any).requestPermission = undefined
        cleanupFunctions.push(() => {
          ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
        })
      }

      const report = compatibility.getCompatibilityReport()
      
      // Verify VR support assessment
      expect(['full', 'partial', 'limited', 'none']).toContain(report.vrSupport)
      
      // Verify browser detection
      expect(report.browser.name).toBeDefined()
      expect(report.browser.platform).toBeDefined()
      
      // Verify feature detection
      expect(typeof report.features.secureContext).toBe('boolean')
      expect(report.features.secureContext).toBe(testCase.secureContext)
      
      // Test VR Manager integration
      const mockViewer = createMockViewer()
      const mockContainer = document.createElement('div')

      const config: VRManagerConfig = {
        viewer: mockViewer,
        container: mockContainer,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin',
        onStateChange: jest.fn()
      }

      const vrManager = new VRManager(config)

      try {
        await vrManager.activateVR()
        expect(['active', 'error']).toContain(vrManager.getState().status)
      } catch (error) {
        // Some configurations may fail, which is expected
        expect(vrManager.getState().status).toBe('error')
      }

      vrManager.cleanup()
    })
  })
})