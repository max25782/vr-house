/**
 * VRManager Integration Tests
 * Tests for complete VR activation flow, permission requests, and cross-browser compatibility
 */

import { VRManager } from '../VRManager'
import { VRManagerConfig, VRState } from '../types'
import {
  createMockViewer,
  createMockStereoPlugin,
  createMockGyroscopePlugin,
  mockDeviceOrientationPermission,
  mockUserAgent,
  mockFullscreenAPI,
  mockSecureContext,
  USER_AGENTS,
} from './mocks/PhotoSphereViewerMocks'

describe('VRManager Integration Tests', () => {
  let vrManager: VRManager
  let config: VRManagerConfig
  let mockOnStateChange: jest.Mock
  let cleanupFunctions: Array<() => void> = []

  beforeEach(() => {
    jest.clearAllMocks()
    cleanupFunctions = []
    mockOnStateChange = jest.fn()
  })

  afterEach(() => {
    if (vrManager) {
      vrManager.cleanup()
    }
    // Run all cleanup functions
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
  })

  describe('Complete VR Activation Flow', () => {
    test('should complete full VR activation flow on iOS device', async () => {
      // Setup iOS environment
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Track state changes
      const stateChanges: VRState[] = []
      mockOnStateChange.mockImplementation((state: VRState) => {
        stateChanges.push({ ...state })
      })

      // Activate VR
      await vrManager.activateVR()

      // Verify complete activation flow
      expect(stateChanges).toEqual([
        expect.objectContaining({ status: 'idle', permissionStatus: 'unknown' }),
        expect.objectContaining({ status: 'requesting' }),
        expect.objectContaining({ status: 'active', permissionStatus: 'granted' })
      ])

      // Verify all components were activated
      expect(mockViewer.getPlugin).toHaveBeenCalledWith('StereoPlugin')
      expect(mockViewer.getPlugin).toHaveBeenCalledWith('GyroscopePlugin')
      expect(mockContainer.requestFullscreen).toHaveBeenCalled()

      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      const gyroPlugin = mockViewer.getPlugin('GyroscopePlugin')
      expect(stereoPlugin.toggle).toHaveBeenCalled()
      expect(gyroPlugin.start).toHaveBeenCalled()
    })

    test('should handle permission denial gracefully', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('denied')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Attempt VR activation
      await expect(vrManager.activateVR()).rejects.toThrow()

      // Verify error state
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          permissionStatus: 'denied',
          error: expect.stringContaining('device permissions')
        })
      )

      // Verify plugins were not activated
      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      expect(stereoPlugin.toggle).not.toHaveBeenCalled()
    })

    test('should complete VR deactivation flow', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      // Mock fullscreen element
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockContainer,
        writable: true
      })

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // First activate VR
      await vrManager.activateVR()
      jest.clearAllMocks()

      // Then deactivate
      await vrManager.deactivateVR()

      // Verify deactivation
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'idle' })
      )

      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      const gyroPlugin = mockViewer.getPlugin('GyroscopePlugin')
      expect(stereoPlugin.toggle).toHaveBeenCalled()
      expect(gyroPlugin.stop).toHaveBeenCalled()
      expect(document.exitFullscreen).toHaveBeenCalled()
    })
  })

  describe('Permission Request Flow', () => {
    test('should handle iOS permission request flow', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Test permission request
      const permissionGranted = await vrManager.requestPermissions()

      expect(permissionGranted).toBe(true)
      expect(vrManager.getPermissionStatus()).toBe('granted')
      expect((DeviceOrientationEvent as any).requestPermission).toHaveBeenCalled()
    })

    test('should cache permission status to prevent duplicate requests', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // First request
      await vrManager.requestPermissions()
      expect((DeviceOrientationEvent as any).requestPermission).toHaveBeenCalledTimes(1)

      // Second request should use cached result
      await vrManager.requestPermissions()
      expect((DeviceOrientationEvent as any).requestPermission).toHaveBeenCalledTimes(1)
    })

    test('should handle permission timeout', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('timeout')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Permission request should timeout
      await expect(vrManager.requestPermissions()).rejects.toThrow('timeout')
      expect(vrManager.getPermissionStatus()).toBe('denied')
    })

    test('should handle non-iOS devices correctly', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Non-iOS devices should not require permission
      const permissionGranted = await vrManager.requestPermissions()

      expect(permissionGranted).toBe(true)
      expect(vrManager.getPermissionStatus()).toBe('granted')
      expect((DeviceOrientationEvent as any).requestPermission).not.toHaveBeenCalled()
    })
  })

  describe('Cross-Browser Compatibility', () => {
    test('should work on iOS Safari', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      await vrManager.activateVR()

      expect(vrManager.getState().status).toBe('active')
      expect(vrManager.detectIOSDevice()).toBe(true)
    })

    test('should work on Android Chrome', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      await vrManager.activateVR()

      expect(vrManager.getState().status).toBe('active')
      expect(vrManager.detectIOSDevice()).toBe(false)
    })

    test('should work on desktop browsers', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      await vrManager.activateVR()

      expect(vrManager.getState().status).toBe('active')
      expect(vrManager.detectIOSDevice()).toBe(false)
    })

    test('should handle missing fullscreen API gracefully', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(false) // No fullscreen API

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Should still activate VR without fullscreen
      await vrManager.activateVR()

      expect(vrManager.getState().status).toBe('active')
    })

    test('should handle insecure context', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Should still work but with warnings
      await vrManager.activateVR()

      expect(vrManager.getState().status).toBe('active')
    })
  })

  describe('Error Recovery and Resilience', () => {
    test('should recover from plugin failures', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      // Create stereo plugin that fails initially
      const mockStereoPlugin = createMockStereoPlugin({ shouldFailToggle: true })
      const mockViewer = createMockViewer({ stereoPlugin: mockStereoPlugin })
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // First attempt should fail
      await expect(vrManager.activateVR()).rejects.toThrow()
      expect(vrManager.getState().status).toBe('error')

      // Fix the plugin and retry
      mockStereoPlugin.toggle.mockImplementation(() => {}) // No longer throws

      // Should be able to retry after error
      await vrManager.toggleVR()
      expect(vrManager.getState().status).toBe('active')
    })

    test('should handle multiple rapid activation attempts', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Start multiple activation attempts simultaneously
      const promises = [
        vrManager.activateVR(),
        vrManager.activateVR(),
        vrManager.activateVR()
      ]

      await Promise.all(promises)

      // Should only activate once
      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      expect(stereoPlugin.toggle).toHaveBeenCalledTimes(1)
      expect(vrManager.getState().status).toBe('active')
    })

    test('should handle cleanup during activation', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Start activation
      const activationPromise = vrManager.activateVR()

      // Cleanup immediately
      vrManager.cleanup()

      // Activation should be rejected
      await expect(activationPromise).rejects.toThrow('VRManager has been destroyed')
    })
  })

  describe('State Management and Transitions', () => {
    test('should maintain consistent state throughout activation', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const stateChanges: VRState[] = []
      mockOnStateChange.mockImplementation((state: VRState) => {
        stateChanges.push({ ...state })
      })

      // Complete activation/deactivation cycle
      await vrManager.activateVR()
      await vrManager.deactivateVR()

      // Verify state transitions
      expect(stateChanges).toEqual([
        expect.objectContaining({ status: 'idle' }),
        expect.objectContaining({ status: 'requesting' }),
        expect.objectContaining({ status: 'active' }),
        expect.objectContaining({ status: 'idle' })
      ])
    })

    test('should handle toggle operations correctly', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Toggle from idle to active
      await vrManager.toggleVR()
      expect(vrManager.getState().status).toBe('active')

      // Toggle from active to idle
      await vrManager.toggleVR()
      expect(vrManager.getState().status).toBe('idle')
    })
  })

  describe('Diagnostic and Monitoring', () => {
    test('should provide comprehensive diagnostic information', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      // Generate some activity
      try {
        await vrManager.activateVR()
      } catch (error) {
        // Expected if permissions fail
      }

      const diagnostics = vrManager.exportDiagnostics()

      expect(diagnostics).toMatchObject({
        sessionId: expect.stringMatching(/^vr-session-/),
        state: expect.objectContaining({
          status: expect.any(String),
          permissionStatus: expect.any(String)
        }),
        errorStats: expect.objectContaining({
          totalErrors: expect.any(Number),
          errorsByCategory: expect.any(Object)
        }),
        recentLogs: expect.any(Array),
        recentErrors: expect.any(Array)
      })
    })

    test('should track session lifecycle', () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)

      config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: mockOnStateChange,
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const logger = vrManager.getLogger()
      const logs = logger.getLogs()

      // Should have session start log
      const sessionStartLog = logs.find(log => 
        log.category === 'Session' && log.message.includes('session started')
      )
      expect(sessionStartLog).toBeDefined()

      vrManager.cleanup()

      // Should have session end log
      const logsAfterCleanup = logger.getLogs()
      const sessionEndLog = logsAfterCleanup.find(log => 
        log.category === 'Session' && log.message.includes('session ended')
      )
      expect(sessionEndLog).toBeDefined()
    })
  })
})