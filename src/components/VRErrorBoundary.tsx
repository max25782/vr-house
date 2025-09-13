'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { VRError, VRErrorCategory } from '../lib/vr/types'

interface VRErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  vrError?: VRError
  retryCount: number
}

interface VRErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, vrError?: VRError) => void
  maxRetries?: number
  showErrorDetails?: boolean
}

/**
 * VRErrorBoundary - Error boundary component specifically designed for VR-related crashes
 * 
 * Features:
 * - Catches and handles VR-related React errors
 * - Provides graceful fallback UI
 * - Offers error reporting and recovery options
 * - Categorizes VR errors for better debugging
 */
export class VRErrorBoundary extends Component<VRErrorBoundaryProps, VRErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout

  constructor(props: VRErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<VRErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const vrError = this.categorizeVRError(error)
    
    // Log error details
    console.error('VRErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)
    console.error('VR Error details:', vrError)

    // Update state with error information
    this.setState({
      error,
      errorInfo,
      vrError
    })

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, vrError)
    }

    // Report error to external service (if needed)
    this.reportError(error, errorInfo, vrError)
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  /**
   * Categorizes errors to determine if they're VR-related and their severity
   */
  private categorizeVRError(error: Error): VRError {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''
    
    let category: VRErrorCategory = 'compatibility'
    let severity: 'low' | 'medium' | 'high' = 'medium'
    let userMessage = 'Произошла ошибка при работе с VR-режимом'
    let recoveryStrategy: VRError['recoveryStrategy'] = 'retry'

    // Categorize based on error message and stack
    if (message.includes('permission') || message.includes('gyroscope') || message.includes('devicemotion')) {
      category = 'permission'
      severity = 'high'
      userMessage = 'Необходимо разрешение на использование гироскопа для VR-режима'
      recoveryStrategy = 'reset_permissions'
    } else if (message.includes('stereo') || message.includes('plugin') || stack.includes('stereoplug')) {
      category = 'plugin'
      severity = 'high'
      userMessage = 'Ошибка инициализации VR-плагина'
      recoveryStrategy = 'reinitialize_plugin'
    } else if (message.includes('timeout') || message.includes('time')) {
      category = 'timeout'
      severity = 'medium'
      userMessage = 'Превышено время ожидания активации VR-режима'
      recoveryStrategy = 'retry'
    } else if (message.includes('webxr') || message.includes('fullscreen') || message.includes('unsupported')) {
      category = 'compatibility'
      severity = 'low'
      userMessage = 'VR-режим не поддерживается в данном браузере'
      recoveryStrategy = 'fallback_mode'
    }

    return {
      id: `vr-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: category, // Backward compatibility
      category,
      message: error.message,
      originalError: error,
      context: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      },
      timestamp: new Date(),
      severity,
      recoveryStrategy,
      userMessage
    }
  }

  /**
   * Reports error to external logging service
   */
  private reportError(error: Error, errorInfo: ErrorInfo, vrError: VRError) {
    // Import error reporter dynamically to avoid circular dependencies
    import('../lib/vr/VRErrorReporter').then(({ vrErrorReporter }) => {
      // Add breadcrumb for the error boundary catch
      vrErrorReporter.addBreadcrumb({
        category: 'vr_state',
        message: 'VR Error Boundary caught error',
        data: {
          errorMessage: error.message,
          errorName: error.name,
          vrErrorCategory: vrError.category,
          vrErrorSeverity: vrError.severity
        }
      })

      // Report the VR error
      vrErrorReporter.reportError(vrError, {
        reactErrorInfo: {
          componentStack: errorInfo.componentStack,
          errorBoundary: 'VRErrorBoundary'
        }
      })
    }).catch(reporterError => {
      console.warn('Failed to load VR error reporter:', reporterError)
      
      // Fallback to console logging
      const errorReport = {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo,
        vrError,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }

      console.warn('VR Error Report (fallback):', errorReport)
    })
  }

  /**
   * Handles retry attempts with recovery service
   */
  private handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3
    
    if (this.state.retryCount < maxRetries && this.state.vrError) {
      try {
        // Import recovery service dynamically
        const { vrErrorRecovery } = await import('../lib/vr/VRErrorRecovery')
        
        // Attempt recovery
        const recoveryResult = await vrErrorRecovery.attemptRecovery(this.state.vrError)
        
        if (recoveryResult.success) {
          this.setState(prevState => ({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            vrError: undefined,
            retryCount: prevState.retryCount + 1
          }))
        } else {
          // Recovery failed, show error message
          console.warn('VR recovery failed:', recoveryResult.message)
        }
      } catch (error) {
        console.error('Failed to load VR recovery service:', error)
        
        // Fallback to simple retry
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          vrError: undefined,
          retryCount: prevState.retryCount + 1
        }))
      }
    }
  }

  /**
   * Handles reset (clears retry count)
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      vrError: undefined,
      retryCount: 0
    })
  }

  /**
   * Handles refresh page
   */
  private handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return this.renderDefaultFallback()
    }

    return this.props.children
  }

  /**
   * Renders the default error fallback UI
   */
  private renderDefaultFallback() {
    const { vrError, retryCount } = this.state
    const { maxRetries = 3, showErrorDetails = false } = this.props
    const canRetry = retryCount < maxRetries

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 text-white z-50">
        <div className="text-center max-w-md mx-4">
          {/* Error Icon */}
          <div className="text-6xl mb-4">
            {vrError?.category === 'permission' ? '🔒' : 
             vrError?.category === 'plugin' ? '🔧' :
             vrError?.category === 'timeout' ? '⏱️' : '⚠️'}
          </div>

          {/* Error Title */}
          <h3 className="text-xl font-semibold mb-4">
            Ошибка VR-режима
          </h3>

          {/* User-friendly error message */}
          <p className="text-gray-300 mb-6">
            {vrError?.userMessage || 'Произошла ошибка при работе с VR-режимом'}
          </p>

          {/* Recovery Actions */}
          <div className="space-y-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Попробовать снова ({maxRetries - retryCount} попыток осталось)
              </button>
            )}

            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Сбросить и продолжить без VR
            </button>

            <button
              onClick={this.handleRefresh}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Обновить страницу
            </button>
          </div>

          {/* Error Details (for debugging) */}
          {showErrorDetails && vrError && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                Подробности ошибки
              </summary>
              <div className="mt-2 p-3 bg-gray-800 rounded text-xs font-mono text-left overflow-auto max-h-32">
                <div><strong>Категория:</strong> {vrError.category}</div>
                <div><strong>Серьезность:</strong> {vrError.severity}</div>
                <div><strong>Сообщение:</strong> {vrError.message}</div>
                <div><strong>ID:</strong> {vrError.id}</div>
                <div><strong>Время:</strong> {vrError.timestamp.toLocaleString()}</div>
              </div>
            </details>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-4">
            Если проблема повторяется, попробуйте использовать другой браузер или устройство
          </p>
        </div>
      </div>
    )
  }
}

export default VRErrorBoundary