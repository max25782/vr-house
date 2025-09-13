/**
 * VRManager Tests
 * Tests for VR activation, deactivation, and error handling
 */

import { VRManager } from '../VRManager'
import { VRManagerConfig, VRState } from '../types'

// Mock Photo Sphere Viewer
const mockViewer = {
  getPlugin: jest.fn()
}

// Mock container element
const mockContainer = {
  requestFullscreen: jest.fn().mockResolvedValue(undefined)
} as unknown as HTMLElement

// Mock stereo plugin
const mockStereoPlugin = {
  toggle: jest.fn(),
  enter: jest.fn(),
  exit: jest.fn()
}

// Mock gyroscope plugin
const mockGyroscopePlugin = {
  isEnabled: jest.fn().mockReturnValue(false),
  start: jest.fn(),
  stop: jest.fn()
}

// Mock state change handler
const mockOnStateChange = jest.fn()

describe('VRManager', () => {
  let vrManager: VRManager
  let config: VRManagerConfig

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock document.fullscreenElement
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    })

    // Mock document.exitFullscreen
    Object.defineProperty(document, 'exitFullscreen', {
      value: jest.fn().mockResolvedValue(undefined),
      writable: true
    })

    // Setup viewer mock to return plugins
    mockViewer.getPlugin.mockImplementation((pluginClass) => {
      if (pluginClass === 'StereoPlugin') return mockStereoPlugin
      if (pluginClass === 'GyroscopePlugin') return mockGyroscopePlugin
      return null
    })

    config = {
      viewer: mockViewer,
      container: mockContainer,
      onStateChange: mockOnStateChange,
      stereoPlugin: 'StereoPlugin',
      gyroscopePlugin: 'GyroscopePlugin'
    }

    vrManager = new VRManager(config)
  })

  afterEach(() => {
    vrManager.cleanup()
  })

  describe('VR Activation', () => {
    beforeEach(() => {
      // Mock successful permission request
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
    })

    test('should activate VR mode successfully', async () => {
      await vrManager.activateVR()

      expect(mockStereoPlugin.toggle).toHaveBeenCalled()
      expect(mockGyroscopePlugin.start).toHaveBeenCalled()
      expect(mockContainer.requestFullscreen).toHaveBeenCalled()
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })

    test('should handle stereo plugin toggle failure gracefully', async () => {
      mockStereoPlugin.toggle.mockImplementation(() => {
        throw new Error('Plugin error')
      })

      await expect(vrManager.activateVR()).rejects.toThrow()
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ 
          status: 'error',
          error: expect.stringContaining('temporarily unavailable')
        })
      )
    })

    test('should use enter method if toggle is not available', async () => {
      mockStereoPlugin.toggle = undefined
      
      await vrManager.activateVR()

      expect(mockStereoPlugin.enter).toHaveBeenCalled()
    })

    test('should handle permission denial', async () => {
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(false)

      await expect(vrManager.activateVR()).rejects.toThrow()
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ 
          status: 'error',
          error: expect.stringContaining('device permissions')
        })
      )
    })

    test('should prevent multiple simultaneous activations', async () => {
      const promise1 = vrManager.activateVR()
      const promise2 = vrManager.activateVR()

      await promise1
      await promise2

      // Should only call toggle once
      expect(mockStereoPlugin.toggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('VR Deactivation', () => {
    beforeEach(async () => {
      // First activate VR
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      await vrManager.activateVR()
      jest.clearAllMocks()
    })

    test('should deactivate VR mode successfully', async () => {
      // Mock fullscreen element
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockContainer,
        writable: true
      })

      await vrManager.deactivateVR()

      expect(mockStereoPlugin.toggle).toHaveBeenCalled()
      expect(mockGyroscopePlugin.stop).toHaveBeenCalled()
      expect(document.exitFullscreen).toHaveBeenCalled()
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'idle' })
      )
    })

    test('should handle deactivation errors gracefully', async () => {
      mockStereoPlugin.toggle.mockImplementation(() => {
        throw new Error('Deactivation error')
      })

      await vrManager.deactivateVR()

      // Should still update state to idle despite error
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'idle' })
      )
    })

    test('should use exit method if available', async () => {
      mockStereoPlugin.toggle = undefined
      
      await vrManager.deactivateVR()

      expect(mockStereoPlugin.exit).toHaveBeenCalled()
    })
  })

  describe('VR Toggle', () => {
    test('should activate VR when idle', async () => {
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      
      await vrManager.toggleVR()

      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })

    test('should deactivate VR when active', async () => {
      // First activate
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      await vrManager.activateVR()
      jest.clearAllMocks()

      // Then toggle (should deactivate)
      await vrManager.toggleVR()

      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'idle' })
      )
    })

    test('should retry activation after error state', async () => {
      // Force error state
      jest.spyOn(vrManager as any, 'requestPermissions').mockRejectedValue(new Error('Permission error'))
      
      try {
        await vrManager.activateVR()
      } catch (e) {
        // Expected error
      }

      // Now mock successful permission and toggle
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      
      await vrManager.toggleVR()

      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })
  })

  describe('Browser Compatibility', () => {
    test('should handle missing fullscreen API', async () => {
      // Remove fullscreen API
      mockContainer.requestFullscreen = undefined

      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      
      await vrManager.activateVR()

      // Should still activate VR without fullscreen
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })

    test('should handle missing gyroscope plugin', async () => {
      mockViewer.getPlugin.mockImplementation((pluginClass) => {
        if (pluginClass === 'StereoPlugin') return mockStereoPlugin
        return null // No gyroscope plugin
      })

      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(true)
      
      await vrManager.activateVR()

      // Should still activate VR without gyroscope
      expect(mockStereoPlugin.toggle).toHaveBeenCalled()
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })
  })

  describe('Error Handling and Logging', () => {
    test('should provide access to error handler', () => {
      const errorHandler = vrManager.getErrorHandler()
      expect(errorHandler).toBeDefined()
      expect(typeof errorHandler.createError).toBe('function')
    })

    test('should provide access to logger', () => {
      const logger = vrManager.getLogger()
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
    })

    test('should track error statistics', async () => {
      // Force an error
      jest.spyOn(vrManager as any, 'requestPermissions').mockResolvedValue(false)
      
      try {
        await vrManager.activateVR()
      } catch (e) {
        // Expected error
      }

      const errorStats = vrManager.getErrorStats()
      expect(errorStats.totalErrors).toBeGreaterThan(0)
      expect(errorStats.errorsByCategory.permission).toBeGreaterThan(0)
    })

    test('should provide recent logs', () => {
      const recentLogs = vrManager.getRecentLogs(5)
      expect(Array.isArray(recentLogs)).toBe(true)
      // Should have at least the initialization log
      expect(recentLogs.length).toBeGreaterThan(0)
    })

    test('should export diagnostic information', () => {
      const diagnostics = vrManager.exportDiagnostics()
      expect(diagnostics).toMatchObject({
        sessionId: expect.stringMatching(/^vr-session-/),
        state: expect.objectContaining({
          status: 'idle',
          permissionStatus: 'unknown'
        }),
        errorStats: expect.any(Object),
        recentLogs: expect.any(Array),
        recentErrors: expect.any(Array)
      })
    })

    test('should log session information on initialization', () => {
      const logger = vrManager.getLogger()
      const logs = logger.getLogs()
      
      // Should have session start and initialization logs
      const sessionLogs = logs.filter(log => log.category === 'Session')
      expect(sessionLogs.length).toBeGreaterThan(0)
      
      const sessionStartLog = sessionLogs.find(log => log.message.includes('session started'))
      expect(sessionStartLog).toBeDefined()
      expect(sessionStartLog?.data).toMatchObject({
        sessionId: expect.stringMatching(/^vr-session-/),
        userAgent: expect.any(String)
      })
    })
  })

  describe('Cleanup', () => {
    test('should prevent operations after cleanup', async () => {
      vrManager.cleanup()

      await expect(vrManager.activateVR()).rejects.toThrow('VRManager has been destroyed')
    })

    test('should clear timeouts on cleanup', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      
      vrManager.cleanup()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    test('should log session end on cleanup', () => {
      const logger = vrManager.getLogger()
      
      vrManager.cleanup()
      
      const logs = logger.getLogs()
      const sessionEndLog = logs.find(log => 
        log.category === 'Session' && log.message.includes('session ended')
      )
      expect(sessionEndLog).toBeDefined()
      expect(sessionEndLog?.data).toMatchObject({
        sessionId: expect.stringMatching(/^vr-session-/),
        duration: expect.any(Number),
        errors: expect.any(Number)
      })
    })

    test('should clear error history on cleanup', () => {
      const errorHandler = vrManager.getErrorHandler()
      
      // Create some errors first
      errorHandler.createError('permission', 'Test error')
      expect(errorHandler.getErrorHistory().length).toBeGreaterThan(0)
      
      vrManager.cleanup()
      
      expect(errorHandler.getErrorHistory().length).toBe(0)
    })
  })
})