'use client'

import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'

interface PanoramaViewerProps {
  src: string
  initialFov?: number
}

export default function PanoramaViewer({ src, initialFov = 65 }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setIsLoading(true)
    setError(null)
    
    // Создаем локальную копию для использования в эффекте
    let isMounted = true
    
    // Устанавливаем таймаут для загрузки
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('Panorama loading timeout exceeded')
        setError('Превышено время ожидания загрузки')
        setIsLoading(false)
      }
    }, 60000) // 60 секунд максимум на загрузку
    
    // Проверяем путь к файлу панорамы
    console.log('Loading panorama from:', src)
    
    // Check if the panorama file exists
    fetch(src, { cache: 'no-cache' }) // Отключаем кеширование
      .then(response => {
        console.log('Panorama file fetch response:', response.status, response.statusText)
        if (!response.ok) {
          throw new Error('Panorama file not found')
        }

        try {
          console.log('Initializing equirectangular viewer with src:', src)
          
          // Инициализируем плагины
          const plugins = []
          
          // Добавляем плагин гироскопа
          plugins.push(GyroscopePlugin)
          
          // Добавляем плагин стерео-режима
          plugins.push(StereoPlugin)
          
          const viewer = new Viewer({
            container,
            panorama: src + '?t=' + new Date().getTime(), // Добавляем временную метку для предотвращения кеширования
            plugins: plugins,
            navbar: ['autorotate', 'zoom', 'move', 'download', 'fullscreen', 'stereo'], // Добавляем все кнопки навигации
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
            }
          })

          // Обрабатываем ошибки через window.onerror
          const originalOnError = window.onerror
          window.onerror = (message) => {
            if (message.toString().includes('Photo Sphere Viewer')) {
              console.error('Panorama viewer error:', message)
              if (isMounted) {
                setError('Ошибка загрузки панорамы')
                setIsLoading(false)
              }
              return true // Предотвращаем стандартную обработку ошибки
            }
            return originalOnError ? originalOnError.apply(window, arguments as any) : false
          }

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
      // Очищаем таймаут при размонтировании компонента
      clearTimeout(loadingTimeout)
      
      // Устанавливаем флаг, что компонент размонтирован
      isMounted = false
      
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [src, initialFov])

  return (
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
  )
}


