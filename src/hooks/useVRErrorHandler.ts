'use client'

import { useCallback, useState } from 'react'
import { VRError, VRErrorCategory } from '../lib/vr/types'

interface VRErrorHandlerState {
  hasError: boolean
  error?: VRError
  retryCount: number
}

interface VRErrorHandlerOptions {
  maxRetries?: number
  onError?: (error: VRError) => void
  onRecovery?: () => void
}

/**
 * Hook for handling VR errors within components
 * 
 * Provides programmatic error handling for VR operations
 * without requiring error boundaries
 */
export function useVRErrorHandler(options: VRErrorHandlerOptions = {}) {
  const { maxRetries = 3, onError, onRecovery } = options
  
  const [errorState, setErrorState] = useState<VRErrorHandlerState>({
    hasError: false,
    retryCount: 0
  })

  /**
   * Creates a VRError from a regular Error
   */
  const createVRError = useCallback((error: Error, category?: VRErrorCategory): VRError => {
    const message = error.message.toLowerCase()
    
    // Auto-detect category if not provided
    let detectedCategory: VRErrorCategory = category || 'compatibility'
    let severity: 'low' | 'medium' | 'high' = 'medium'
    let userMessage = 'Произошла ошибка при работе с VR-режимом'
    let recoveryStrategy: VRError['recoveryStrategy'] = 'retry'

    if (message.includes('permission') || message.includes('gyroscope')) {
      detectedCategory = 'permission'
      severity = 'high'
      userMessage = 'Необходимо разрешение на использование гироскопа'
      recoveryStrategy = 'reset_permissions'
    } else if (message.includes('plugin') || message.includes('stereo')) {
      detectedCategory = 'plugin'
      severity = 'high'
      userMessage = 'Ошибка VR-плагина'
      recoveryStrategy = 'reinitialize_plugin'
    } else if (message.includes('timeout')) {
      detectedCategory = 'timeout'
      severity = 'medium'
      userMessage = 'Превышено время ожидания'
      recoveryStrategy = 'retry'
    }

    return {
      id: `vr-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: detectedCategory,
      category: detectedCategory,
      message: error.message,
      originalError: error,
      context: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        retryCount: errorState.retryCount
      },
      timestamp: new Date(),
      severity,
      recoveryStrategy,
      userMessage
    }
  }, [errorState.retryCount])

  /**
   * Handles a VR error
   */
  const handleError = useCallback((error: Error | VRError, category?: VRErrorCategory) => {
    const vrError = error instanceof Error ? createVRError(error, category) : error
    
    console.error('VR Error handled:', vrError)
    
    setErrorState(prev => ({
      hasError: true,
      error: vrError,
      retryCount: prev.retryCount
    }))

    if (onError) {
      onError(vrError)
    }
  }, [createVRError, onError])

  /**
   * Attempts to retry the failed operation
   */
  const retry = useCallback(() => {
    if (errorState.retryCount < maxRetries) {
      setErrorState(prev => ({
        hasError: false,
        error: undefined,
        retryCount: prev.retryCount + 1
      }))

      if (onRecovery) {
        onRecovery()
      }

      return true
    }
    return false
  }, [errorState.retryCount, maxRetries, onRecovery])

  /**
   * Resets the error state
   */
  const reset = useCallback(() => {
    setErrorState({
      hasError: false,
      error: undefined,
      retryCount: 0
    })

    if (onRecovery) {
      onRecovery()
    }
  }, [onRecovery])

  /**
   * Wraps an async VR operation with error handling
   */
  const wrapVROperation = useCallback(async <T>(
    operation: () => Promise<T>,
    category?: VRErrorCategory
  ): Promise<T | null> => {
    try {
      const result = await operation()
      
      // Clear any previous errors on success
      if (errorState.hasError) {
        reset()
      }
      
      return result
    } catch (error) {
      handleError(error as Error, category)
      return null
    }
  }, [errorState.hasError, handleError, reset])

  /**
   * Gets user-friendly error message
   */
  const getErrorMessage = useCallback(() => {
    return errorState.error?.userMessage || 'Произошла неизвестная ошибка'
  }, [errorState.error])

  /**
   * Checks if retry is available
   */
  const canRetry = errorState.retryCount < maxRetries

  /**
   * Gets recovery suggestions based on error type
   */
  const getRecoverySuggestions = useCallback(() => {
    if (!errorState.error) return []

    const suggestions = []

    switch (errorState.error.recoveryStrategy) {
      case 'retry':
        if (canRetry) {
          suggestions.push('Попробуйте еще раз')
        }
        break
      case 'reset_permissions':
        suggestions.push('Проверьте разрешения браузера')
        suggestions.push('Обновите страницу и разрешите доступ к гироскопу')
        break
      case 'reinitialize_plugin':
        suggestions.push('Перезагрузите страницу')
        suggestions.push('Попробуйте другой браузер')
        break
      case 'fallback_mode':
        suggestions.push('Используйте обычный режим просмотра')
        suggestions.push('Попробуйте на другом устройстве')
        break
      case 'user_intervention':
        suggestions.push('Обратитесь к администратору')
        break
    }

    return suggestions
  }, [errorState.error, canRetry])

  return {
    // State
    hasError: errorState.hasError,
    error: errorState.error,
    retryCount: errorState.retryCount,
    canRetry,

    // Actions
    handleError,
    retry,
    reset,
    wrapVROperation,

    // Helpers
    getErrorMessage,
    getRecoverySuggestions,
    createVRError
  }
}

export default useVRErrorHandler