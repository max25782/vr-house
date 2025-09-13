/**
 * VRErrorHandler - Comprehensive error handling system for VR functionality
 * Provides error categorization, recovery mechanisms, and detailed logging
 */

import { VRError, VRErrorCategory, VRErrorSeverity, VRRecoveryStrategy } from './types'

export interface VRErrorHandlerConfig {
  maxRetries?: number
  retryDelay?: number
  enableDetailedLogging?: boolean
  onError?: (error: VRError) => void
  onRecovery?: (strategy: VRRecoveryStrategy, success: boolean) => void
}

export class VRErrorHandler {
  private config: VRErrorHandlerConfig
  private errorHistory: VRError[] = []
  private retryAttempts: Map<string, number> = new Map()

  constructor(config: VRErrorHandlerConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableDetailedLogging: true,
      ...config
    }
  }

  /**
   * Create a categorized VR error with detailed context
   */
  createError(
    category: VRErrorCategory,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): VRError {
    const error: VRError = {
      id: this.generateErrorId(),
      type: category, // Maintain backward compatibility
      category,
      message,
      originalError,
      context,
      timestamp: new Date(),
      severity: this.determineSeverity(category),
      recoveryStrategy: this.determineRecoveryStrategy(category),
      userMessage: this.generateUserMessage(category, message)
    }

    this.logError(error)
    this.errorHistory.push(error)
    this.config.onError?.(error)

    return error
  }

  /**
   * Handle error with automatic recovery attempts
   */
  async handleError(error: VRError, recoveryContext?: any): Promise<boolean> {
    this.logError(error, 'Handling error with recovery')

    const recoveryKey = `${error.category}-${error.message}`
    const currentAttempts = this.retryAttempts.get(recoveryKey) || 0

    if (currentAttempts >= (this.config.maxRetries || 3)) {
      this.log('error', `Max retry attempts reached for ${error.category} error`, { error, attempts: currentAttempts })
      return false
    }

    this.retryAttempts.set(recoveryKey, currentAttempts + 1)

    try {
      const success = await this.executeRecoveryStrategy(error, recoveryContext)
      
      if (success) {
        this.log('info', `Recovery successful for ${error.category} error`, { error, attempts: currentAttempts + 1 })
        this.retryAttempts.delete(recoveryKey)
        this.config.onRecovery?.(error.recoveryStrategy, true)
        return true
      } else {
        this.log('warn', `Recovery failed for ${error.category} error`, { error, attempts: currentAttempts + 1 })
        this.config.onRecovery?.(error.recoveryStrategy, false)
        return false
      }
    } catch (recoveryError) {
      this.log('error', `Recovery attempt threw error for ${error.category}`, { 
        originalError: error, 
        recoveryError, 
        attempts: currentAttempts + 1 
      })
      return false
    }
  }

  /**
   * Execute recovery strategy based on error category
   */
  private async executeRecoveryStrategy(error: VRError, context?: any): Promise<boolean> {
    await this.delay(this.config.retryDelay || 1000)

    switch (error.recoveryStrategy) {
      case 'retry':
        return this.retryOperation(error, context)
      
      case 'reset_permissions':
        return this.resetPermissions(error, context)
      
      case 'reinitialize_plugin':
        return this.reinitializePlugin(error, context)
      
      case 'fallback_mode':
        return this.enableFallbackMode(error, context)
      
      case 'user_intervention':
        return this.requestUserIntervention(error, context)
      
      case 'none':
      default:
        this.log('info', `No recovery strategy available for ${error.category} error`)
        return false
    }
  }

  /**
   * Retry the original operation
   */
  private async retryOperation(error: VRError, context?: any): Promise<boolean> {
    this.log('info', `Retrying operation for ${error.category} error`)
    
    if (context?.retryCallback && typeof context.retryCallback === 'function') {
      try {
        await context.retryCallback()
        return true
      } catch (retryError) {
        this.log('error', 'Retry operation failed', { originalError: error, retryError })
        return false
      }
    }
    
    return false
  }

  /**
   * Reset permission status and request again
   */
  private async resetPermissions(error: VRError, context?: any): Promise<boolean> {
    this.log('info', `Resetting permissions for ${error.category} error`)
    
    if (context?.vrManager && typeof context.vrManager.resetPermissionStatus === 'function') {
      try {
        context.vrManager.resetPermissionStatus()
        const permissionGranted = await context.vrManager.requestPermissions()
        return permissionGranted
      } catch (permissionError) {
        this.log('error', 'Permission reset failed', { originalError: error, permissionError })
        return false
      }
    }
    
    return false
  }

  /**
   * Reinitialize VR plugins
   */
  private async reinitializePlugin(error: VRError, context?: any): Promise<boolean> {
    this.log('info', `Reinitializing plugin for ${error.category} error`)
    
    if (context?.reinitializeCallback && typeof context.reinitializeCallback === 'function') {
      try {
        await context.reinitializeCallback()
        return true
      } catch (reinitError) {
        this.log('error', 'Plugin reinitialization failed', { originalError: error, reinitError })
        return false
      }
    }
    
    return false
  }

  /**
   * Enable fallback mode without problematic features
   */
  private async enableFallbackMode(error: VRError, context?: any): Promise<boolean> {
    this.log('info', `Enabling fallback mode for ${error.category} error`)
    
    if (context?.enableFallback && typeof context.enableFallback === 'function') {
      try {
        await context.enableFallback()
        return true
      } catch (fallbackError) {
        this.log('error', 'Fallback mode activation failed', { originalError: error, fallbackError })
        return false
      }
    }
    
    return false
  }

  /**
   * Request user intervention for manual resolution
   */
  private async requestUserIntervention(error: VRError, context?: any): Promise<boolean> {
    this.log('info', `Requesting user intervention for ${error.category} error`)
    
    if (context?.showUserDialog && typeof context.showUserDialog === 'function') {
      try {
        const userResponse = await context.showUserDialog(error)
        return userResponse === true
      } catch (dialogError) {
        this.log('error', 'User intervention dialog failed', { originalError: error, dialogError })
        return false
      }
    }
    
    return false
  }

  /**
   * Determine error severity based on category
   */
  private determineSeverity(category: VRErrorCategory): VRErrorSeverity {
    switch (category) {
      case 'permission':
        return 'medium'
      case 'plugin':
        return 'high'
      case 'timeout':
        return 'medium'
      case 'compatibility':
        return 'low'
      default:
        return 'medium'
    }
  }

  /**
   * Determine recovery strategy based on error category
   */
  private determineRecoveryStrategy(category: VRErrorCategory): VRRecoveryStrategy {
    switch (category) {
      case 'permission':
        return 'reset_permissions'
      case 'plugin':
        return 'reinitialize_plugin'
      case 'timeout':
        return 'retry'
      case 'compatibility':
        return 'fallback_mode'
      default:
        return 'retry'
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(category: VRErrorCategory, technicalMessage: string): string {
    switch (category) {
      case 'permission':
        return 'VR mode requires device permissions. Please allow access to device orientation when prompted.'
      case 'plugin':
        return 'VR functionality is temporarily unavailable. Please try again in a moment.'
      case 'timeout':
        return 'VR activation is taking longer than expected. Please try again.'
      case 'compatibility':
        return 'VR mode is not fully supported on this device or browser. Some features may be limited.'
      default:
        return 'An error occurred while activating VR mode. Please try again.'
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `vr-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log error with detailed context
   */
  private logError(error: VRError, additionalMessage?: string): void {
    if (!this.config.enableDetailedLogging) return

    const logData = {
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      context: error.context,
      originalError: error.originalError,
      recoveryStrategy: error.recoveryStrategy
    }

    const logMessage = additionalMessage 
      ? `${additionalMessage}: ${error.message}` 
      : error.message

    this.log(error.severity === 'high' ? 'error' : 'warn', logMessage, logData)
  }

  /**
   * Enhanced logging with different levels
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableDetailedLogging) return

    const timestamp = new Date().toISOString()
    const logPrefix = `[VRErrorHandler:${level.toUpperCase()}] ${timestamp}`

    switch (level) {
      case 'error':
        console.error(`${logPrefix} ${message}`, data)
        break
      case 'warn':
        console.warn(`${logPrefix} ${message}`, data)
        break
      case 'info':
      default:
        console.log(`${logPrefix} ${message}`, data)
        break
    }
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): VRError[] {
    return [...this.errorHistory]
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByCategory: Record<VRErrorCategory, number>
    errorsBySeverity: Record<VRErrorSeverity, number>
    recentErrors: VRError[]
  } {
    const errorsByCategory: Record<VRErrorCategory, number> = {
      permission: 0,
      plugin: 0,
      timeout: 0,
      compatibility: 0
    }

    const errorsBySeverity: Record<VRErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0
    }

    this.errorHistory.forEach(error => {
      errorsByCategory[error.category]++
      errorsBySeverity[error.severity]++
    })

    // Get errors from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentErrors = this.errorHistory.filter(error => error.timestamp > fiveMinutesAgo)

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors
    }
  }

  /**
   * Clear error history (useful for testing or memory management)
   */
  clearErrorHistory(): void {
    this.errorHistory = []
    this.retryAttempts.clear()
    this.log('info', 'Error history cleared')
  }

  /**
   * Check if error should be retried based on history
   */
  shouldRetryError(category: VRErrorCategory, message: string): boolean {
    const recoveryKey = `${category}-${message}`
    const currentAttempts = this.retryAttempts.get(recoveryKey) || 0
    return currentAttempts < (this.config.maxRetries || 3)
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}