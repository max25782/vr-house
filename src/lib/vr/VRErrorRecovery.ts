/**
 * VR Error Recovery Service
 * Provides automated and manual recovery strategies for VR errors
 */

import { VRError, VRRecoveryStrategy } from './types'
import { vrErrorReporter } from './VRErrorReporter'

export interface VRRecoveryResult {
  success: boolean
  strategy: VRRecoveryStrategy
  message: string
  nextAction?: 'retry' | 'fallback' | 'user_intervention'
}

export interface VRRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  enableAutomaticRecovery?: boolean
  fallbackMode?: 'disable_vr' | 'reload_page' | 'reset_state'
}

/**
 * VR Error Recovery Service
 * 
 * Features:
 * - Automated recovery strategies based on error type
 * - Manual recovery options for user intervention
 * - Recovery success tracking and learning
 * - Fallback mode management
 */
export class VRErrorRecovery {
  private recoveryAttempts = new Map<string, number>()
  private successfulRecoveries = new Map<VRRecoveryStrategy, number>()
  private options: Required<VRRecoveryOptions>

  constructor(options: VRRecoveryOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableAutomaticRecovery: options.enableAutomaticRecovery ?? true,
      fallbackMode: options.fallbackMode || 'disable_vr'
    }
  }

  /**
   * Attempts to recover from a VR error
   */
  async attemptRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    const errorKey = this.getErrorKey(vrError)
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0

    // Check if we've exceeded max retries
    if (attemptCount >= this.options.maxRetries) {
      return this.performFallbackRecovery(vrError)
    }

    // Increment attempt count
    this.recoveryAttempts.set(errorKey, attemptCount + 1)

    // Add breadcrumb
    vrErrorReporter.addBreadcrumb({
      category: 'vr_state',
      message: `Attempting recovery for ${vrError.category} error`,
      data: {
        strategy: vrError.recoveryStrategy,
        attemptCount: attemptCount + 1,
        errorId: vrError.id
      }
    })

    // Perform recovery based on strategy
    const result = await this.executeRecoveryStrategy(vrError)

    // Track successful recoveries
    if (result.success) {
      const successCount = this.successfulRecoveries.get(vrError.recoveryStrategy) || 0
      this.successfulRecoveries.set(vrError.recoveryStrategy, successCount + 1)
      
      // Reset attempt count on success
      this.recoveryAttempts.delete(errorKey)
    }

    return result
  }

  /**
   * Executes the appropriate recovery strategy
   */
  private async executeRecoveryStrategy(vrError: VRError): Promise<VRRecoveryResult> {
    switch (vrError.recoveryStrategy) {
      case 'retry':
        return this.performRetryRecovery(vrError)
      
      case 'reset_permissions':
        return this.performPermissionResetRecovery(vrError)
      
      case 'reinitialize_plugin':
        return this.performPluginReinitializationRecovery(vrError)
      
      case 'fallback_mode':
        return this.performFallbackModeRecovery(vrError)
      
      case 'user_intervention':
        return this.performUserInterventionRecovery(vrError)
      
      default:
        return this.performGenericRecovery(vrError)
    }
  }

  /**
   * Performs retry recovery with delay
   */
  private async performRetryRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    try {
      // Wait before retry
      await this.delay(this.options.retryDelay)

      return {
        success: true,
        strategy: 'retry',
        message: 'Готов к повторной попытке',
        nextAction: 'retry'
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'retry',
        message: 'Не удалось выполнить повторную попытку',
        nextAction: 'fallback'
      }
    }
  }

  /**
   * Performs permission reset recovery
   */
  private async performPermissionResetRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    try {
      // Clear any cached permission states
      if ('permissions' in navigator) {
        // Note: We can't actually reset permissions, but we can clear our cache
        localStorage.removeItem('vr-gyroscope-permission')
        localStorage.removeItem('vr-device-motion-permission')
      }

      return {
        success: true,
        strategy: 'reset_permissions',
        message: 'Состояние разрешений сброшено. Попробуйте активировать VR снова.',
        nextAction: 'user_intervention'
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'reset_permissions',
        message: 'Не удалось сбросить состояние разрешений',
        nextAction: 'fallback'
      }
    }
  }

  /**
   * Performs plugin reinitialization recovery
   */
  private async performPluginReinitializationRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    try {
      // Clear any plugin-related state
      localStorage.removeItem('vr-plugin-state')
      
      // Force garbage collection if available
      if ('gc' in window && typeof window.gc === 'function') {
        window.gc()
      }

      return {
        success: true,
        strategy: 'reinitialize_plugin',
        message: 'VR-плагины будут переинициализированы',
        nextAction: 'retry'
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'reinitialize_plugin',
        message: 'Не удалось переинициализировать VR-плагины',
        nextAction: 'fallback'
      }
    }
  }

  /**
   * Performs fallback mode recovery
   */
  private async performFallbackModeRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    try {
      // Set fallback mode flag
      localStorage.setItem('vr-fallback-mode', 'true')
      localStorage.setItem('vr-fallback-reason', vrError.category)

      return {
        success: true,
        strategy: 'fallback_mode',
        message: 'VR-режим отключен. Панорама будет работать в обычном режиме.',
        nextAction: 'fallback'
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'fallback_mode',
        message: 'Не удалось переключиться в резервный режим',
        nextAction: 'user_intervention'
      }
    }
  }

  /**
   * Performs user intervention recovery
   */
  private async performUserInterventionRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    return {
      success: false,
      strategy: 'user_intervention',
      message: 'Требуется вмешательство пользователя для решения проблемы',
      nextAction: 'user_intervention'
    }
  }

  /**
   * Performs generic recovery
   */
  private async performGenericRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    try {
      // Clear all VR-related state
      this.clearVRState()

      return {
        success: true,
        strategy: 'none',
        message: 'Состояние VR-системы сброшено',
        nextAction: 'retry'
      }
    } catch (error) {
      return {
        success: false,
        strategy: 'none',
        message: 'Не удалось выполнить общее восстановление',
        nextAction: 'user_intervention'
      }
    }
  }

  /**
   * Performs fallback recovery when all else fails
   */
  private async performFallbackRecovery(vrError: VRError): Promise<VRRecoveryResult> {
    switch (this.options.fallbackMode) {
      case 'disable_vr':
        localStorage.setItem('vr-disabled', 'true')
        return {
          success: true,
          strategy: 'fallback_mode',
          message: 'VR-функциональность отключена из-за повторяющихся ошибок',
          nextAction: 'fallback'
        }

      case 'reload_page':
        setTimeout(() => window.location.reload(), 2000)
        return {
          success: true,
          strategy: 'fallback_mode',
          message: 'Страница будет перезагружена через 2 секунды',
          nextAction: 'fallback'
        }

      case 'reset_state':
        this.clearVRState()
        this.recoveryAttempts.clear()
        return {
          success: true,
          strategy: 'fallback_mode',
          message: 'Все состояние VR-системы сброшено',
          nextAction: 'fallback'
        }

      default:
        return {
          success: false,
          strategy: 'none',
          message: 'Все попытки восстановления исчерпаны',
          nextAction: 'user_intervention'
        }
    }
  }

  /**
   * Clears all VR-related state from localStorage
   */
  private clearVRState(): void {
    const vrKeys = Object.keys(localStorage).filter(key => 
      key.toLowerCase().includes('vr') || 
      key.toLowerCase().includes('panorama') ||
      key.toLowerCase().includes('gyroscope') ||
      key.toLowerCase().includes('stereo')
    )

    vrKeys.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Gets recovery statistics
   */
  getRecoveryStats(): {
    totalAttempts: number
    successfulRecoveries: Record<VRRecoveryStrategy, number>
    activeAttempts: number
  } {
    const totalAttempts = Array.from(this.recoveryAttempts.values())
      .reduce((sum, count) => sum + count, 0)

    return {
      totalAttempts,
      successfulRecoveries: Object.fromEntries(this.successfulRecoveries) as Record<VRRecoveryStrategy, number>,
      activeAttempts: this.recoveryAttempts.size
    }
  }

  /**
   * Resets recovery state
   */
  resetRecoveryState(): void {
    this.recoveryAttempts.clear()
    this.successfulRecoveries.clear()
  }

  /**
   * Creates a unique key for error tracking
   */
  private getErrorKey(vrError: VRError): string {
    return `${vrError.category}-${vrError.message.substring(0, 50)}`
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Global instance
export const vrErrorRecovery = new VRErrorRecovery({
  maxRetries: 3,
  retryDelay: 1000,
  enableAutomaticRecovery: true,
  fallbackMode: 'disable_vr'
})

export default vrErrorRecovery