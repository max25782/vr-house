/**
 * VRErrorHandler Tests
 * Tests for error categorization, recovery mechanisms, and logging
 */

import { VRErrorHandler } from '../VRErrorHandler'
import { VRError, VRErrorCategory, VRRecoveryStrategy } from '../types'

describe('VRErrorHandler', () => {
  let errorHandler: VRErrorHandler
  let mockOnError: jest.Mock
  let mockOnRecovery: jest.Mock

  beforeEach(() => {
    mockOnError = jest.fn()
    mockOnRecovery = jest.fn()
    
    errorHandler = new VRErrorHandler({
      maxRetries: 3,
      retryDelay: 100, // Shorter delay for tests
      enableDetailedLogging: false, // Disable console output in tests
      onError: mockOnError,
      onRecovery: mockOnRecovery
    })
  })

  describe('Error Creation', () => {
    test('should create error with all required fields', () => {
      const error = errorHandler.createError(
        'permission',
        'Test permission error',
        new Error('Original error'),
        { testContext: 'value' }
      )

      expect(error).toMatchObject({
        category: 'permission',
        type: 'permission', // Backward compatibility
        message: 'Test permission error',
        severity: 'medium',
        recoveryStrategy: 'reset_permissions',
        userMessage: expect.stringContaining('device permissions')
      })
      expect(error.id).toBeDefined()
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.originalError).toBeInstanceOf(Error)
      expect(error.context).toEqual({ testContext: 'value' })
      expect(mockOnError).toHaveBeenCalledWith(error)
    })

    test('should determine correct severity for each category', () => {
      const permissionError = errorHandler.createError('permission', 'Permission error')
      const pluginError = errorHandler.createError('plugin', 'Plugin error')
      const timeoutError = errorHandler.createError('timeout', 'Timeout error')
      const compatibilityError = errorHandler.createError('compatibility', 'Compatibility error')

      expect(permissionError.severity).toBe('medium')
      expect(pluginError.severity).toBe('high')
      expect(timeoutError.severity).toBe('medium')
      expect(compatibilityError.severity).toBe('low')
    })

    test('should determine correct recovery strategy for each category', () => {
      const permissionError = errorHandler.createError('permission', 'Permission error')
      const pluginError = errorHandler.createError('plugin', 'Plugin error')
      const timeoutError = errorHandler.createError('timeout', 'Timeout error')
      const compatibilityError = errorHandler.createError('compatibility', 'Compatibility error')

      expect(permissionError.recoveryStrategy).toBe('reset_permissions')
      expect(pluginError.recoveryStrategy).toBe('reinitialize_plugin')
      expect(timeoutError.recoveryStrategy).toBe('retry')
      expect(compatibilityError.recoveryStrategy).toBe('fallback_mode')
    })

    test('should generate user-friendly messages', () => {
      const permissionError = errorHandler.createError('permission', 'Technical permission error')
      const pluginError = errorHandler.createError('plugin', 'Technical plugin error')
      const timeoutError = errorHandler.createError('timeout', 'Technical timeout error')
      const compatibilityError = errorHandler.createError('compatibility', 'Technical compatibility error')

      expect(permissionError.userMessage).toContain('device permissions')
      expect(pluginError.userMessage).toContain('temporarily unavailable')
      expect(timeoutError.userMessage).toContain('taking longer than expected')
      expect(compatibilityError.userMessage).toContain('not fully supported')
    })
  })

  describe('Error Recovery', () => {
    test('should handle retry recovery strategy', async () => {
      const mockRetryCallback = jest.fn().mockResolvedValue(true)
      const error = errorHandler.createError('timeout', 'Timeout error')
      
      const success = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })

      expect(success).toBe(true)
      expect(mockRetryCallback).toHaveBeenCalled()
      expect(mockOnRecovery).toHaveBeenCalledWith('retry', true)
    })

    test('should handle permission reset recovery strategy', async () => {
      const mockVRManager = {
        resetPermissionStatus: jest.fn(),
        requestPermissions: jest.fn().mockResolvedValue(true)
      }
      const error = errorHandler.createError('permission', 'Permission error')
      
      const success = await errorHandler.handleError(error, {
        vrManager: mockVRManager
      })

      expect(success).toBe(true)
      expect(mockVRManager.resetPermissionStatus).toHaveBeenCalled()
      expect(mockVRManager.requestPermissions).toHaveBeenCalled()
      expect(mockOnRecovery).toHaveBeenCalledWith('reset_permissions', true)
    })

    test('should handle plugin reinitialization recovery strategy', async () => {
      const mockReinitializeCallback = jest.fn().mockResolvedValue(true)
      const error = errorHandler.createError('plugin', 'Plugin error')
      
      const success = await errorHandler.handleError(error, {
        reinitializeCallback: mockReinitializeCallback
      })

      expect(success).toBe(true)
      expect(mockReinitializeCallback).toHaveBeenCalled()
      expect(mockOnRecovery).toHaveBeenCalledWith('reinitialize_plugin', true)
    })

    test('should handle fallback mode recovery strategy', async () => {
      const mockEnableFallback = jest.fn().mockResolvedValue(true)
      const error = errorHandler.createError('compatibility', 'Compatibility error')
      
      const success = await errorHandler.handleError(error, {
        enableFallback: mockEnableFallback
      })

      expect(success).toBe(true)
      expect(mockEnableFallback).toHaveBeenCalled()
      expect(mockOnRecovery).toHaveBeenCalledWith('fallback_mode', true)
    })

    test('should handle user intervention recovery strategy', async () => {
      const mockShowUserDialog = jest.fn().mockResolvedValue(true)
      const error: VRError = {
        ...errorHandler.createError('permission', 'Permission error'),
        recoveryStrategy: 'user_intervention'
      }
      
      const success = await errorHandler.handleError(error, {
        showUserDialog: mockShowUserDialog
      })

      expect(success).toBe(true)
      expect(mockShowUserDialog).toHaveBeenCalledWith(error)
      expect(mockOnRecovery).toHaveBeenCalledWith('user_intervention', true)
    })

    test('should respect max retry attempts', async () => {
      const mockRetryCallback = jest.fn().mockRejectedValue(new Error('Retry failed'))
      const error = errorHandler.createError('timeout', 'Timeout error')
      
      // First 3 attempts should be made
      for (let i = 0; i < 3; i++) {
        const success = await errorHandler.handleError(error, {
          retryCallback: mockRetryCallback
        })
        expect(success).toBe(false)
      }

      // 4th attempt should be rejected due to max retries
      const finalSuccess = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })
      expect(finalSuccess).toBe(false)
      expect(mockRetryCallback).toHaveBeenCalledTimes(3) // Should not be called on 4th attempt
    })

    test('should reset retry count after successful recovery', async () => {
      const mockRetryCallback = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      const error = errorHandler.createError('timeout', 'Timeout error')
      
      // First attempt fails
      const firstAttempt = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })
      expect(firstAttempt).toBe(false)

      // Second attempt succeeds
      const secondAttempt = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })
      expect(secondAttempt).toBe(true)

      // Third attempt should work (retry count was reset)
      const thirdAttempt = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })
      expect(thirdAttempt).toBe(true)
    })
  })

  describe('Error Statistics', () => {
    test('should track error statistics correctly', () => {
      errorHandler.createError('permission', 'Permission error 1')
      errorHandler.createError('permission', 'Permission error 2')
      errorHandler.createError('plugin', 'Plugin error 1')
      errorHandler.createError('timeout', 'Timeout error 1')

      const stats = errorHandler.getErrorStats()

      expect(stats.totalErrors).toBe(4)
      expect(stats.errorsByCategory.permission).toBe(2)
      expect(stats.errorsByCategory.plugin).toBe(1)
      expect(stats.errorsByCategory.timeout).toBe(1)
      expect(stats.errorsByCategory.compatibility).toBe(0)
      expect(stats.errorsBySeverity.medium).toBe(3) // 2 permission + 1 timeout
      expect(stats.errorsBySeverity.high).toBe(1) // 1 plugin
      expect(stats.errorsBySeverity.low).toBe(0)
    })

    test('should track recent errors correctly', () => {
      // Create an old error (simulate by manipulating timestamp)
      const oldError = errorHandler.createError('permission', 'Old error')
      const errorHistory = errorHandler.getErrorHistory()
      errorHistory[0].timestamp = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago

      // Create a recent error
      errorHandler.createError('plugin', 'Recent error')

      const stats = errorHandler.getErrorStats()
      expect(stats.recentErrors).toHaveLength(1)
      expect(stats.recentErrors[0].message).toBe('Recent error')
    })
  })

  describe('Error History Management', () => {
    test('should maintain error history', () => {
      const error1 = errorHandler.createError('permission', 'Error 1')
      const error2 = errorHandler.createError('plugin', 'Error 2')

      const history = errorHandler.getErrorHistory()
      expect(history).toHaveLength(2)
      expect(history[0]).toEqual(error1)
      expect(history[1]).toEqual(error2)
    })

    test('should clear error history', () => {
      errorHandler.createError('permission', 'Error 1')
      errorHandler.createError('plugin', 'Error 2')

      expect(errorHandler.getErrorHistory()).toHaveLength(2)

      errorHandler.clearErrorHistory()

      expect(errorHandler.getErrorHistory()).toHaveLength(0)
      const stats = errorHandler.getErrorStats()
      expect(stats.totalErrors).toBe(0)
    })

    test('should check retry eligibility correctly', () => {
      const shouldRetry1 = errorHandler.shouldRetryError('timeout', 'Test error')
      expect(shouldRetry1).toBe(true)

      // Simulate failed attempts
      for (let i = 0; i < 3; i++) {
        errorHandler.handleError(errorHandler.createError('timeout', 'Test error'), {})
      }

      const shouldRetry2 = errorHandler.shouldRetryError('timeout', 'Test error')
      expect(shouldRetry2).toBe(false)
    })
  })
})