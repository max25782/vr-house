'use client'

import React, { ComponentType, ErrorInfo } from 'react'
import VRErrorBoundary from './VRErrorBoundary'
import { VRError } from '../lib/vr/types'

interface WithVRErrorBoundaryOptions {
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, vrError?: VRError) => void
  maxRetries?: number
  showErrorDetails?: boolean
}

/**
 * Higher-order component that wraps a component with VRErrorBoundary
 * 
 * Usage:
 * const SafePanoramaViewer = withVRErrorBoundary(PanoramaViewer, {
 *   maxRetries: 3,
 *   showErrorDetails: process.env.NODE_ENV === 'development'
 * })
 */
export function withVRErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithVRErrorBoundaryOptions = {}
) {
  const WithVRErrorBoundaryComponent = (props: P) => {
    return (
      <VRErrorBoundary
        fallback={options.fallback}
        onError={options.onError}
        maxRetries={options.maxRetries}
        showErrorDetails={options.showErrorDetails}
      >
        <WrappedComponent {...props} />
      </VRErrorBoundary>
    )
  }

  // Set display name for debugging
  WithVRErrorBoundaryComponent.displayName = 
    `withVRErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithVRErrorBoundaryComponent
}

export default withVRErrorBoundary