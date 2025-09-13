'use client'

import React from 'react'
import CubePanoramaViewer from './cube-panorama-viewer'
import VRPanoramaErrorBoundary from './VRPanoramaErrorBoundary'

interface SafeCubePanoramaViewerProps {
  basePath: string
  files?: { r: string; l: string; u: string; d: string; f: string; b: string }
  initialFov?: number
  showErrorDetails?: boolean
}

/**
 * CubePanoramaViewer wrapped with VR error boundary for crash protection
 * 
 * This component demonstrates how to use VRPanoramaErrorBoundary
 * to protect cube panorama viewers from VR-related crashes
 */
export default function SafeCubePanoramaViewer({ 
  basePath,
  files = { r: 'r.jpg', l: 'l.jpg', u: 'u.jpg', d: 'd.jpg', f: 'f.jpg', b: 'b.jpg' },
  initialFov = 65,
  showErrorDetails = process.env.NODE_ENV === 'development'
}: SafeCubePanoramaViewerProps) {
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
      panoramaType="cube"
      panoramaSource={basePath}
      onVRDisabled={handleVRDisabled}
      onPanoramaReload={handlePanoramaReload}
    >
      <CubePanoramaViewer 
        basePath={basePath}
        files={files}
        initialFov={initialFov}
      />
    </VRPanoramaErrorBoundary>
  )
}