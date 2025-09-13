'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { VRManager, VRState } from '../lib/vr'
import VRButton from './VRButton'

interface PanoramaViewerProps {
  src: string
  initialFov?: number
}

export default function PanoramaViewer({ src, initialFov = 65 }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const vrManagerRef = useRef<VRManager | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vrState, setVrState] = useState<VRState>({
    status: 'idle',
    permissionStatus: 'unknown'
  })

  // VR state change handler
  const handleVRStateChange = useCallback((state: VRState) => {
    setVrState(state)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setIsLoading(true)
    setError(null)
    
    let isMounted = true
    
    // Set loading timeout
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('Panorama loading timeout exceeded')
        setError('Превышено время ожидания загрузки')
        setIsLoading(false)
      }
    }, 60000)
    
    console.log('Loading panorama from:', src)
    
    // Check if the panorama file exists
    fetch(src, { cache: 'no-cache' })
      .then(response => {
        console.log('Panorama file fetch response:', response.status, response.statusText)
        if (!response.ok) {
          throw new Error('Panorama file not found')
        }

        try {
          console.log('Initializing panorama viewer with src:', src)
          
          const viewer = new Viewer({
            container,
            panorama: src + '?t=' + new Date().getTime(),
            plugins: [GyroscopePlugin, StereoPlugin],
            navbar: ['autorotate', 'zoom', 'move', 'download', 'fullscreen'],
            defaultZoomLvl: 0,
            lang: {
              stereoNotification: 'Нажмите на экран, чтобы войти в VR-режим'
            },
            requestHeaders: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })

          viewer.addEventListener('ready', () => {
            if (isMounted) {
              setIsLoading(false)
              
              // Initialize VRManager after viewer is ready
              try {
                const vrManager = new VRManager({
                  viewer,
                  container,
                  onStateChange: handleVRStateChange,
                  stereoPlugin: StereoPlugin,
                  gyroscopePlugin: GyroscopePlugin
                })
                
                vrManagerRef.current = vrManager
                console.log('VRManager initialized successfully')
              } catch (vrError) {
                console.error('Failed to initialize VRManager:', vrError)
                // Continue without VR functionality
              }
            }
          })



          viewerRef.current = viewer
        } catch (e) {
          console.error('Failed to initialize panorama viewer:', e)
          if (isMounted) {
            setError('Ошибка инициализации просмотрщика')
            setIsLoading(false)
          }
        }
      })
      .catch(error => {
        console.error('Failed to load panorama:', error)
        if (isMounted) {
          setError('Панорама не найдена')
          setIsLoading(false)
        }
      })

    return () => {
      // Clear loading timeout
      clearTimeout(loadingTimeout)
      
      // Set unmounted flag
      isMounted = false
      
      // Cleanup VRManager
      if (vrManagerRef.current) {
        vrManagerRef.current.cleanup()
        vrManagerRef.current = null
      }
      
      // Cleanup viewer
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [src, initialFov, handleVRStateChange])

  
  return (
    <div className="relative">
      <div ref={containerRef} className="h-dvh w-full bg-black relative">
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg">Загрузка панорамы...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-semibold mb-2">{error}</h3>
              <p className="text-gray-400">Добавьте файл pano.jpg в папку public/vr/test/</p>
            </div>
          </div>
        )}
      </div>
      
      {/* VR Button using VRManager */}
      {vrManagerRef.current && !isLoading && !error && (
        <VRButton 
          vrManager={vrManagerRef.current}
          size="large"
          position="fixed"
          showLabel={true}
        />
      )}
    </div>
  )
}


