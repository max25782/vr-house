/**
 * VR Error Recovery Tests
 * Tests for VR error recovery service functionality
 */

import { VRErrorRecovery } from '../../lib/vr/VRErrorRecovery'
import { VRError } from '../../lib/vr/types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
  keys: jest.fn(() => [])
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock Object.keys for localStorage
Object.keys = jest.fn(() => [])

describe('VRErrorRecovery', () => {
  let recovery: VRErrorRecovery
  let mockVRError: VRError

  beforeEach(() => {
    recovery = new VRErrorRecovery({
      maxRetries: 3,
      retryDelay: 100, // Shorter delay for tests
      enableAutomaticRecovery: true,
      fallbackMode: 'disable_vr'
    })

    mockVRError = {
      id: 'test-error-1',
      type: 'permission',
      category: 'permission',
      message: 'Permission denied for gyroscope',
      timestamp: new Date(),
      severity: 'high',
      recoveryStrategy: 'reset_permissions',
      userMessage: 'Необходимо разрешение на использование гироскопа'
    }

    // Clear mocks
    jest.clearAllMocks()
  })

  describe('Recovery Strategies', () => {
    test('should perform retry recovery', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      const result = await recovery.attemptRecovery(retryError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('retry')
      expect(result.nextAction).toBe('retry')
    })

    test('should perform permission reset recovery', async () => {
      const result = await recovery.attemptRecovery(mockVRError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('reset_permissions')
      expect(result.nextAction).toBe('user_intervention')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vr-gyroscope-permission')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vr-device-motion-permission')
    })

    test('should perform plugin reinitialization recovery', async () => {
      const pluginError: VRError = {
        ...mockVRError,
        category: 'plugin',
        recoveryStrategy: 'reinitialize_plugin'
      }

      const result = await recovery.attemptRecovery(pluginError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('reinitialize_plugin')
      expect(result.nextAction).toBe('retry')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vr-plugin-state')
    })

    test('should perform fallback mode recovery', async () => {
      const compatibilityError: VRError = {
        ...mockVRError,
        category: 'compatibility',
        recoveryStrategy: 'fallback_mode'
      }

      const result = await recovery.attemptRecovery(compatibilityError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('fallback_mode')
      expect(result.nextAction).toBe('fallback')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vr-fallback-mode', 'true')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vr-fallback-reason', 'compatibility')
    })

    test('should handle user intervention recovery', async () => {
      const userError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'user_intervention'
      }

      const result = await recovery.attemptRecovery(userError)

      expect(result.success).toBe(false)
      expect(result.strategy).toBe('user_intervention')
      expect(result.nextAction).toBe('user_intervention')
    })
  })

  describe('Retry Logic', () => {
    test('should track retry attempts', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      // First attempt
      await recovery.attemptRecovery(retryError)
      
      // Second attempt
      await recovery.attemptRecovery(retryError)
      
      // Third attempt
      await recovery.attemptRecovery(retryError)

      const stats = recovery.getRecoveryStats()
      expect(stats.totalAttempts).toBe(3)
    })

    test('should perform fallback recovery after max retries', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      // Exhaust retries
      await recovery.attemptRecovery(retryError)
      await recovery.attemptRecovery(retryError)
      await recovery.attemptRecovery(retryError)
      
      // Fourth attempt should trigger fallback
      const result = await recovery.attemptRecovery(retryError)

      expect(result.strategy).toBe('fallback_mode')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vr-disabled', 'true')
    })

    test('should reset attempt count on successful recovery', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      // First attempt (should succeed)
      const result = await recovery.attemptRecovery(retryError)
      expect(result.success).toBe(true)

      // Stats should show no active attempts after success
      const stats = recovery.getRecoveryStats()
      expect(stats.activeAttempts).toBe(0)
    })
  })

  describe('Fallback Modes', () => {
    test('should handle disable_vr fallback mode', async () => {
      const recoveryWithDisable = new VRErrorRecovery({
        maxRetries: 1,
        fallbackMode: 'disable_vr'
      })

      // Exhaust retries
      await recoveryWithDisable.attemptRecovery(mockVRError)
      const result = await recoveryWithDisable.attemptRecovery(mockVRError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('fallback_mode')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vr-disabled', 'true')
    })

    test('should handle reset_state fallback mode', async () => {
      // Mock Object.keys to return some VR-related keys
      Object.keys = jest.fn(() => ['vr-test-key', 'panorama-state', 'other-key'])
      
      const recoveryWithReset = new VRErrorRecovery({
        maxRetries: 1,
        fallbackMode: 'reset_state'
      })

      // Exhaust retries
      await recoveryWithReset.attemptRecovery(mockVRError)
      const result = await recoveryWithReset.attemptRecovery(mockVRError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('fallback_mode')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vr-test-key')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('panorama-state')
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other-key')
    })
  })

  describe('Statistics and State Management', () => {
    test('should track successful recoveries', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      await recovery.attemptRecovery(retryError)

      const stats = recovery.getRecoveryStats()
      expect(stats.successfulRecoveries.retry).toBe(1)
    })

    test('should reset recovery state', () => {
      recovery.resetRecoveryState()

      const stats = recovery.getRecoveryStats()
      expect(stats.totalAttempts).toBe(0)
      expect(stats.activeAttempts).toBe(0)
    })

    test('should provide comprehensive recovery statistics', async () => {
      const retryError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'retry'
      }

      await recovery.attemptRecovery(retryError)
      await recovery.attemptRecovery(mockVRError) // permission error

      const stats = recovery.getRecoveryStats()
      expect(stats.totalAttempts).toBeGreaterThan(0)
      expect(stats.successfulRecoveries).toBeDefined()
      expect(stats.activeAttempts).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle recovery failures gracefully', async () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const result = await recovery.attemptRecovery(mockVRError)

      // Should still return a result even if localStorage fails
      expect(result).toBeDefined()
      expect(result.strategy).toBeDefined()
    })

    test('should handle unknown recovery strategies', async () => {
      const unknownError: VRError = {
        ...mockVRError,
        recoveryStrategy: 'none'
      }

      const result = await recovery.attemptRecovery(unknownError)

      expect(result.success).toBe(true)
      expect(result.strategy).toBe('none')
      expect(result.nextAction).toBe('retry')
    })
  })
})