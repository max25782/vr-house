'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { CubemapAdapter } from '@photo-sphere-viewer/cubemap-adapter'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import { VRManager, VRState } from '../lib/vr'
import VRButton from './VRButton'

interface CubePanoramaViewerProps {
  basePath: string
  /**
   * Mapping of cube faces in your folder. Defaults assume:
   * r=px, l=nx, u=py, d=ny, f=pz, b=nz
   */
  files?: { r: string; l: string; u: string; d: string; f: string; b: string }
  initialFov?: number
}

export default function CubePanoramaViewer({
  basePath,
  files = { r: 'r.jpg', l: 'l.jpg', u: 'u.jpg', d: 'd.jpg', f: 'f.jpg', b: 'b.jpg' },
  initialFov = 65,
}: CubePanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const vrManagerRef = useRef<VRManager | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

    setError(null)
    setIsLoading(true)
    
    let isMounted = true
    
    // Set loading timeout
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('Cubemap panorama loading timeout exceeded')
        setError('Превышено время ожидания загрузки')
        setIsLoading(false)
      }
    }, 120000) // 120 seconds maximum for loading
    
    console.log('Base path for cubemap:', basePath)
    console.log('Files configuration:', files)
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime()
    
    // Create cube faces object for CubemapAdapter
    const cubeFaces = {
      front: `${basePath}/${files.f}?t=${timestamp}`,
      right: `${basePath}/${files.r}?t=${timestamp}`,
      back: `${basePath}/${files.b}?t=${timestamp}`,
      left: `${basePath}/${files.l}?t=${timestamp}`,
      top: `${basePath}/${files.u}?t=${timestamp}`,
      bottom: `${basePath}/${files.d}?t=${timestamp}`,
    }
    
    try {
      console.log('Initializing cubemap viewer with faces:', JSON.stringify(cubeFaces))
      
      const viewer = new Viewer({
        container,
        adapter: CubemapAdapter,
        panorama: cubeFaces,
        plugins: [
          [GyroscopePlugin, {
            touchmove: true,
            moveMode: 'smooth',
            moveInertia: true,
            mousemove: true,
            mousemoveMultiplier: 0.8,
            captureCursor: false,
            absolutePosition: true,
          }],
          [StereoPlugin, {
            displayMode: 'cardboard',
            enableVR: true,
            defaultLong: 0,
            defaultLat: 0,
            mousemove: true,
            touchmove: true,
            clickToEnter: false, // Disable built-in click to enter - VRManager will handle this
            reverseControls: false,
            size: 2,
            keyboard: false,
            autorotate: false,
            button: {
              visible: false, // Hide built-in VR button - we'll use VRButton component
            }
          }],
          [AutorotatePlugin, {
            autostartDelay: 2000,
            autostartOnIdle: false,
            autorotatePitch: 0,
            autorotateSpeed: '2rpm',
          }],
        ],
        navbar: ['autorotate', 'zoom', 'move', 'fullscreen'], // Remove 'stereo' - VRButton will handle VR
        defaultZoomLvl: 0,
        lang: {
          stereoNotification: 'Нажмите на экран, чтобы войти в мобильный VR-режим. Поместите телефон в VR-очки для просмотра.'
        },
        requestHeaders: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      viewer.addEventListener('ready', () => {
        if (isMounted) {
          clearTimeout(loadingTimeout) // Clear timeout when ready
          setIsLoading(false)
          console.log('Cubemap panorama loaded successfully')
          
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
            console.log('VRManager initialized successfully for cube panorama')
          } catch (vrError) {
            console.error('Failed to initialize VRManager for cube panorama:', vrError)
            // Continue without VR functionality
          }
        }
      })
      
      viewer.addEventListener('panorama-loaded', () => {
        if (isMounted) {
          clearTimeout(loadingTimeout) // Clear timeout when loaded
          console.log('Cube panorama loaded event fired')
          setIsLoading(false)
        }
      })
      
      viewer.addEventListener('position-updated', () => {
        if (isMounted) {
          console.log('Position updated, setting loading to false')
          setIsLoading(false)
        }
      })

      // Add error event listener
      viewer.addEventListener('error', (event) => {
        if (isMounted) {
          clearTimeout(loadingTimeout) // Clear timeout on error
          console.error('Cube panorama viewer error:', event)
          setError('Ошибка загрузки панорамы')
          setIsLoading(false)
        }
      })

      viewerRef.current = viewer
    } catch (e) {
      console.error('Failed to initialize cube panorama viewer:', e)
      if (isMounted) {
        setError('Ошибка инициализации просмотрщика')
        setIsLoading(false)
      }
    }

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
  }, [basePath, files, initialFov, handleVRStateChange])


  
  return (
    <div className="relative">
      <div ref={containerRef} className="h-dvh w-full bg-black relative">
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg">Загрузка кубической панорамы...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🔲</div>
              <h3 className="text-xl font-semibold mb-2">{error}</h3>
              <p className="text-gray-400">Проверьте файлы кубической панорамы в папке public/vr/willow/</p>
              <p className="text-gray-400 text-sm mt-2">Нужны: r.jpg, l.jpg, u.jpg, d.jpg, f.jpg, b.jpg</p>
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


