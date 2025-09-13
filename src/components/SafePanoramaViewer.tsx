'use client'

import React from 'react'
import PanoramaViewer from './panorama-viewer'
import VRPanoramaErrorBoundary from './VRPanoramaErrorBoundary'

interface SafePanoramaViewerProps {
  src: string
  initialFov?: number
  showErrorDetails?: boolean
}

/**
 * PanoramaViewer wrapped with VR error boundary for crash protection
 * 
 * This component demonstrates how to use VRPanoramaErrorBoundary
 * to protect panorama viewers from VR-related crashes
 */
export default function SafePanoramaViewer({ 
  src, 
  initialFov = 65,
  showErrorDetails = process.env.NODE_ENV === 'development'
}: SafePanoramaViewerProps) {
  const handleVRDisabled = () => {
    console.log('VR functionality has been disabled due to errors')
    // Could show a toast notification or update UI state
  }

  const handlePanoramaReload = () => {
    console.log('Panorama reload requested')
    // Could trigger a reload or show reload UI
  }

  return (
    <VRPanoramaErrorBoundary
      panoramaType="regular"
      panoramaSource={src}
      onVRDisabled={handleVRDisabled}
      onPanoramaReload={handlePanoramaReload}
    >
      <PanoramaViewer 
        src={src} 
        initialFov={initialFov}
      />
    </VRPanoramaErrorBoundary>
  )
}