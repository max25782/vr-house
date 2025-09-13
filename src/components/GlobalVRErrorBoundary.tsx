'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { VRError } from '../lib/vr/types'
import VRErrorBoundary from './VRErrorBoundary'

interface GlobalVRErrorBoundaryProps {
  children: ReactNode
}

interface GlobalVRErrorBoundaryState {
  hasGlobalError: boolean
  errorCount: number
}

/**
 * Global VR Error Boundary for application-level VR error handling
 * 
 * Features:
 * - Catches VR errors that escape component-level boundaries
 * - Provides application-level error reporting
 * - Tracks error frequency for debugging
 * - Offers global recovery options
 */
export class GlobalVRErrorBoundary extends Component<
  GlobalVRErrorBoundaryProps, 
  GlobalVRErrorBoundaryState
> {
  private errorReportingInterval?: NodeJS.Timeout

  constructor(props: GlobalVRErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasGlobalError: false,
      errorCount: 0
    }
  }

  componentDidMount() {
    // Set up global error listeners for unhandled VR errors
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.addEventListener('error', this.handleGlobalError)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.removeEventListener('error', this.handleGlobalError)
    
    if (this.errorReportingInterval) {
      clearInterval(this.errorReportingInterval)
    }
  }

  /**
   * Handles unhandled promise rejections that might be VR-related
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason
    
    if (this.isVRRelatedError(error)) {
      console.error('Global VR Promise Rejection:', error)
      this.reportGlobalVRError(error, 'unhandled_promise')
      
      // Prevent the default browser error handling
      event.preventDefault()
    }
  }

  /**
   * Handles global JavaScript errors that might be VR-related
   */
  private handleGlobalError = (event: ErrorEvent) => {
    const error = event.error
    
    if (this.isVRRelatedError(error)) {
      console.error('Global VR Error:', error)
      this.reportGlobalVRError(error, 'global_error')
    }
  }

  /**
   * Determines if an error is VR-related based on message and stack trace
   */
  private isVRRelatedError(error: any): boolean {
    if (!error) return false
    
    const message = (error.message || '').toLowerCase()
    const stack = (error.stack || '').toLowerCase()
    
    const vrKeywords = [
      'stereo', 'gyroscope', 'devicemotion', 'deviceorientation',
      'webxr', 'vr', 'fullscreen', 'photo-sphere-viewer',
      'vrmanager', 'permission'
    ]
    
    return vrKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    )
  }

  /**
   * Reports global VR errors for monitoring and debugging
   */
  private reportGlobalVRError(error: any, source: string) {
    const errorReport = {
      type: 'global_vr_error',
      source,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Unknown'
      },
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount + 1
      }
    }

    console.warn('Global VR Error Report:', errorReport)
    
    // Update error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }))

    // TODO: Send to external error reporting service
    // Example: sendToErrorService(errorReport)
  }

  /**
   * Handles VR errors caught by the React error boundary
   */
  private handleVRError = (error: Error, errorInfo: ErrorInfo, vrError?: VRError) => {
    console.error('Global VR Boundary Error:', {
      error,
      errorInfo,
      vrError,
      errorCount: this.state.errorCount
    })

    this.setState(prevState => ({
      hasGlobalError: true,
      errorCount: prevState.errorCount + 1
    }))

    // Report to external service
    this.reportGlobalVRError(error, 'react_boundary')
  }

  /**
   * Renders global error fallback UI
   */
  private renderGlobalFallback = () => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-lg mx-4">
          {/* Global Error Icon */}
          <div className="text-8xl mb-6">🚨</div>

          {/* Global Error Title */}
          <h1 className="text-3xl font-bold mb-4">
            Критическая ошибка VR-системы
          </h1>

          {/* Global Error Message */}
          <p className="text-gray-300 mb-8 text-lg">
            Произошла серьезная ошибка в VR-системе приложения. 
            Приложение временно недоступно.
          </p>

          {/* Error Statistics */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">
              Количество ошибок в этой сессии: {this.state.errorCount}
            </p>
          </div>

          {/* Global Recovery Actions */}
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-lg font-semibold"
            >
              Перезагрузить приложение
            </button>

            <button
              onClick={() => {
                // Clear any VR-related localStorage
                Object.keys(localStorage).forEach(key => {
                  if (key.toLowerCase().includes('vr') || key.toLowerCase().includes('panorama')) {
                    localStorage.removeItem(key)
                  }
                })
                window.location.reload()
              }}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Сбросить VR-настройки и перезагрузить
            </button>

            <button
              onClick={() => window.history.back()}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Вернуться на предыдущую страницу
            </button>
          </div>

          {/* Help Information */}
          <div className="mt-8 p-4 bg-yellow-900 bg-opacity-50 rounded-lg">
            <p className="text-sm text-yellow-200">
              Если проблема повторяется, попробуйте:
            </p>
            <ul className="text-sm text-yellow-200 mt-2 space-y-1">
              <li>• Использовать другой браузер</li>
              <li>• Отключить блокировщики рекламы</li>
              <li>• Проверить подключение к интернету</li>
              <li>• Обновить браузер до последней версии</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasGlobalError) {
      return this.renderGlobalFallback()
    }

    return (
      <VRErrorBoundary
        onError={this.handleVRError}
        maxRetries={1}
        showErrorDetails={process.env.NODE_ENV === 'development'}
      >
        {this.props.children}
      </VRErrorBoundary>
    )
  }
}

export default GlobalVRErrorBoundary