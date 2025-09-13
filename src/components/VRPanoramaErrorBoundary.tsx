'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { VRError } from '../lib/vr/types'
import VRErrorBoundary from './VRErrorBoundary'

interface VRPanoramaErrorBoundaryProps {
  children: ReactNode
  panoramaType?: 'regular' | 'cube'
  panoramaSource?: string
  onVRDisabled?: () => void
  onPanoramaReload?: () => void
}

interface VRPanoramaErrorBoundaryState {
  vrDisabled: boolean
}

/**
 * Specialized error boundary for panorama viewers with VR functionality
 * 
 * Features:
 * - VR-specific error handling and recovery
 * - Option to disable VR and continue with regular panorama viewing
 * - Panorama-specific error messages and recovery options
 * - Integration with VRManager error reporting
 */
export class VRPanoramaErrorBoundary extends Component<
  VRPanoramaErrorBoundaryProps, 
  VRPanoramaErrorBoundaryState
> {
  constructor(props: VRPanoramaErrorBoundaryProps) {
    super(props)
    
    this.state = {
      vrDisabled: false
    }
  }

  /**
   * Handles VR-specific errors with panorama context
   */
  private handleVRError = (error: Error, errorInfo: ErrorInfo, vrError?: VRError) => {
    console.error('VR Panorama Error:', {
      error,
      errorInfo,
      vrError,
      panoramaType: this.props.panoramaType,
      panoramaSource: this.props.panoramaSource
    })

    // If it's a VR-related error, we might want to disable VR and continue
    if (vrError && this.shouldDisableVR(vrError)) {
      this.setState({ vrDisabled: true })
      
      if (this.props.onVRDisabled) {
        this.props.onVRDisabled()
      }
    }
  }

  /**
   * Determines if VR should be disabled based on error type
   */
  private shouldDisableVR(vrError: VRError): boolean {
    // Disable VR for compatibility issues or repeated plugin failures
    return vrError.category === 'compatibility' || 
           (vrError.category === 'plugin' && vrError.severity === 'high')
  }

  /**
   * Renders custom fallback for panorama-specific errors
   */
  private renderPanoramaFallback = () => {
    const { panoramaType = 'regular', panoramaSource } = this.props

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 text-white z-50">
        <div className="text-center max-w-md mx-4">
          {/* Panorama Icon */}
          <div className="text-6xl mb-4">🌐</div>

          {/* Error Title */}
          <h3 className="text-xl font-semibold mb-4">
            Ошибка загрузки панорамы
          </h3>

          {/* Context-specific message */}
          <p className="text-gray-300 mb-6">
            {panoramaType === 'cube' 
              ? 'Не удалось загрузить кубическую панораму. Проверьте, что все файлы граней находятся в указанной папке.'
              : 'Не удалось загрузить панораму. Проверьте путь к файлу изображения.'
            }
          </p>

          {/* Recovery Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Перезагрузить панораму
            </button>

            {this.state.vrDisabled && (
              <div className="p-3 bg-yellow-900 bg-opacity-50 rounded-lg">
                <p className="text-sm text-yellow-200">
                  VR-режим отключен из-за проблем совместимости. 
                  Панорама будет работать в обычном режиме.
                </p>
              </div>
            )}

            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Вернуться назад
            </button>
          </div>

          {/* Technical Details */}
          {panoramaSource && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                Техническая информация
              </summary>
              <div className="mt-2 p-3 bg-gray-800 rounded text-xs font-mono text-left">
                <div><strong>Тип:</strong> {panoramaType}</div>
                <div><strong>Источник:</strong> {panoramaSource}</div>
                <div><strong>VR отключен:</strong> {this.state.vrDisabled ? 'Да' : 'Нет'}</div>
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }

  render() {
    return (
      <VRErrorBoundary
        onError={this.handleVRError}
        fallback={this.renderPanoramaFallback()}
        maxRetries={2}
        showErrorDetails={process.env.NODE_ENV === 'development'}
      >
        {this.props.children}
      </VRErrorBoundary>
    )
  }
}

export default VRPanoramaErrorBoundary