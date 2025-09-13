'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { VRManager, VRState, VRManagerConfig } from '../lib/vr'

interface UseVRManagerOptions {
  viewer: any // Photo Sphere Viewer instance
  container: HTMLElement | null
  stereoPlugin?: any
  gyroscopePlugin?: any
  onStateChange?: (state: VRState) => void
}

interface UseVRManagerReturn {
  vrManager: VRManager | null
  vrState: VRState
  isReady: boolean
  error: string | null
}

export function useVRManager({
  viewer,
  container,
  stereoPlugin,
  gyroscopePlugin,
  onStateChange
}: UseVRManagerOptions): UseVRManagerReturn {
  const vrManagerRef = useRef<VRManager | null>(null)
  const [vrState, setVRState] = useState<VRState>({
    status: 'idle',
    permissionStatus: 'unknown'
  })
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle VR state changes
  const handleStateChange = useCallback((newState: VRState) => {
    setVRState(newState)
    onStateChange?.(newState)
  }, [onStateChange])

  // Initialize VRManager
  useEffect(() => {
    if (!viewer || !container) {
      setIsReady(false)
      setError('Viewer or container not available')
      return
    }

    try {
      const config: VRManagerConfig = {
        viewer,
        container,
        onStateChange: handleStateChange,
        stereoPlugin,
        gyroscopePlugin
      }

      const manager = new VRManager(config)
      vrManagerRef.current = manager
      setIsReady(true)
      setError(null)

      // Get initial state
      const initialState = manager.getState()
      setVRState(initialState)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize VRManager'
      setError(errorMessage)
      setIsReady(false)
      console.error('VRManager initialization failed:', err)
    }

    // Cleanup function
    return () => {
      if (vrManagerRef.current) {
        vrManagerRef.current.cleanup()
        vrManagerRef.current = null
      }
      setIsReady(false)
    }
  }, [viewer, container, stereoPlugin, gyroscopePlugin, handleStateChange])

  return {
    vrManager: vrManagerRef.current,
    vrState,
    isReady,
    error
  }
}