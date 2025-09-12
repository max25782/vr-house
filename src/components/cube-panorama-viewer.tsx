'use client'

import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { CubemapAdapter } from '@photo-sphere-viewer/cubemap-adapter'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'

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
  files = { r: 'r.jpg', l: 'l.jpg', u: 'u_rotated.jpg', d: 'd_rotated.jpg', f: 'f.jpg', b: 'b.jpg' },
  initialFov = 65,
}: CubePanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setError(null)
    setIsLoading(true)
    
    // Создаем локальную копию isLoading для использования в эффекте
    let isMounted = true
    
    // Увеличиваем таймаут для загрузки до 120 секунд
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.error('Cubemap panorama loading timeout exceeded')
        setError('Превышено время ожидания загрузки')
        setIsLoading(false)
      }
    }, 120000) // 120 секунд максимум на загрузку
    
    // Проверяем наличие файлов перед созданием конфигурации
    console.log('Base path for cubemap:', basePath)
    console.log('Files configuration:', files)
    
    // Добавляем временную метку для предотвращения кеширования
    const timestamp = new Date().getTime()
    
    // Create cube faces object for CubemapAdapter с временной меткой для предотвращения кеширования
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
      
      // Инициализируем плагины с правильной типизацией
      const plugins: ([any, any])[] = [
        [GyroscopePlugin, {
          // Настройки гироскопа, оптимизированные для iPhone
          touchmove: true,
          moveMode: 'smooth',
          moveInertia: true,
          mousemove: true,
          mousemoveMultiplier: 0.8, // Уменьшаем чувствительность для iPhone
          captureCursor: false, // Не захватываем курсор для мобильных устройств
          absolutePosition: true, // Используем абсолютное позиционирование для гироскопа
        }],
        [StereoPlugin, {
          // Настройки стерео режима для мобильных VR очков
          displayMode: 'cardboard', // Режим для мобильных VR очков
          enableVR: true,
          defaultLong: 0,
          defaultLat: 0,
          mousemove: true,
          touchmove: true,
          clickToEnter: true, // Разрешаем вход по клику
          reverseControls: false, // Не переворачиваем управление
          size: 1, // Размер разделения экрана (1 = полный)
          keyboard: false, // Отключаем клавиатуру для мобильных устройств
        }],
        [AutorotatePlugin, {
          // Настройки автоповорота
          autostartDelay: 2000,
          autostartOnIdle: false,
          autorotatePitch: 0,
          autorotateSpeed: '2rpm',
        }],
      ]
      
      const viewer = new Viewer({
        container,
        adapter: CubemapAdapter,
        panorama: cubeFaces,
        plugins: plugins,
        navbar: [
          {
            id: 'autorotate-button',
            title: 'Автоповорот',
            className: 'psv-button--hover-scale psv-autorotate-button',
            content: 'Автоповорот',
          } as any,
          'zoom', 
          'move', 
          'fullscreen', 
          {
            id: 'stereo',
            title: 'Мобильный VR режим',
            className: 'psv-button--hover-scale psv-stereo-button',
            content: 'VR',
            icon: 'cardboard', // Иконка для мобильного VR
          } as any
        ], // Добавляем все кнопки навигации
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

      // Обрабатываем ошибки через window.onerror
      const originalOnError = window.onerror
      window.onerror = (message) => {
        if (message.toString().includes('Photo Sphere Viewer')) {
          console.error('Cube panorama viewer error:', message)
          setError('Ошибка загрузки панорамы')
          setIsLoading(false)
          return true // Предотвращаем стандартную обработку ошибки
        }
        return originalOnError ? originalOnError.apply(window, arguments as any) : false
      }

      // Устанавливаем обработчики событий
      viewer.addEventListener('ready', () => {
        if (isMounted) {
          setIsLoading(false)
          console.log('Cubemap panorama loaded successfully')
        }
        
        // Проверяем поддержку мобильных устройств для VR
        // На мобильных устройствах используем гироскоп без WebXR
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        const isIPhone11ProMax = /iPhone/i.test(navigator.userAgent) && window.screen.height === 896
        
        console.log('Мобильное устройство:', isMobile)
        console.log('iOS устройство:', isIOS)
        console.log('Возможно iPhone 11 Pro Max:', isIPhone11ProMax)
        
        // Проверяем наличие WebXR API
        const hasWebXR = 'xr' in navigator
        console.log('WebXR API доступен:', hasWebXR)
        
        // Запрашиваем разрешение на использование датчиков для iOS
        if (isIOS && typeof DeviceOrientationEvent !== 'undefined' && 
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          console.log('Запрашиваем разрешение на использование гироскопа в iOS')
          
          // Добавляем кнопку для запроса разрешений
          const permissionButton = document.createElement('button')
          permissionButton.innerText = 'Разрешить доступ к гироскопу'
          permissionButton.className = 'psv-button psv-button--hover-scale ios-permission-button'
          permissionButton.style.position = 'absolute'
          permissionButton.style.top = '50%'
          permissionButton.style.left = '50%'
          permissionButton.style.transform = 'translate(-50%, -50%)'
          permissionButton.style.zIndex = '1000'
          permissionButton.style.padding = '12px 20px'
          permissionButton.style.backgroundColor = '#0066cc'
          permissionButton.style.color = 'white'
          permissionButton.style.border = 'none'
          permissionButton.style.borderRadius = '8px'
          permissionButton.style.fontWeight = 'bold'
          
          permissionButton.onclick = () => {
            (DeviceOrientationEvent as any).requestPermission()
              .then((response: string) => {
                if (response === 'granted') {
                  console.log('Разрешение на использование гироскопа получено')
                  permissionButton.remove()
                } else {
                  console.error('Разрешение на использование гироскопа не получено')
                  alert('Для работы VR необходим доступ к гироскопу')
                }
              })
              .catch(console.error)
          }
          
          container.appendChild(permissionButton)
        }
        
        if (isMobile || hasWebXR) {
          console.log('WebXR поддерживается в браузере или мобильное устройство')
          
          // Проверяем доступность VR устройств только если WebXR доступен
          if (hasWebXR) {
            // Используем приведение типа для navigator.xr
            ((navigator as any).xr)?.isSessionSupported('immersive-vr')
            .then((supported: boolean) => {
              console.log('VR устройства доступны:', supported)
              
              // Если VR поддерживается, убедимся что кнопка стерео видна
              if (supported) {
                setTimeout(() => {
                  const stereoButton = document.querySelector('.psv-stereo-button')
                  if (stereoButton) {
                    console.log('VR кнопка найдена и будет отображена')
                    (stereoButton as HTMLElement).classList.remove('psv-button--disabled')
                    
                    // Принудительно активируем плагин стерео
                    try {
                      const stereoPlugin = viewer.getPlugin(StereoPlugin)
                      if (stereoPlugin) {
                        console.log('Активируем StereoPlugin для WebXR')
                        // Добавляем обработчик клика на кнопку стерео
                        // Заменяем обработчик на прямой вызов
                        (stereoButton as HTMLElement).onclick = (event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          
                          console.log('Нажата кнопка VR, запускаем мобильный VR режим (cardboard)')
                          try {
                            // Специальная обработка для iPhone
                            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
                            
                            if (isIOS) {
                              // Для iOS сначала запрашиваем разрешение на использование гироскопа
                              if (typeof DeviceOrientationEvent !== 'undefined' && 
                                  typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                                
                                console.log('Запрашиваем разрешение на использование гироскопа для VR')
                                
                                (DeviceOrientationEvent as any).requestPermission()
                                  .then((response: string) => {
                                    if (response === 'granted') {
                                      console.log('Разрешение на использование гироскопа получено, активируем VR')
                                      
                                      // Активируем VR режим после получения разрешения
                                      setTimeout(() => {
                                        try {
                                          console.log('Вызываем stereoPlugin.toggle() для iOS')
                                          stereoPlugin.toggle()
                                          
                                          // Активируем гироскоп
                                          const gyroPlugin = viewer.getPlugin(GyroscopePlugin)
                                          if (gyroPlugin) {
                                            console.log('Активируем гироскоп для iOS')
                                            gyroPlugin.start()
                                          }
                                        } catch (e) {
                                          console.error('Ошибка активации VR для iOS:', e)
                                        }
                                      }, 500)
                                    } else {
                                      console.error('Разрешение на использование гироскопа не получено')
                                      alert('Для работы VR необходим доступ к гироскопу')
                                    }
                                  })
                                  .catch(err => {
                                    console.error('Ошибка запроса разрешения на гироскоп:', err)
                                    alert('Произошла ошибка при запросе разрешения на использование гироскопа')
                                  })
                              } else {
                                console.log('Метод requestPermission не найден, пробуем активировать VR напрямую')
                                stereoPlugin.toggle()
                              }
                            } else {
                              // Для не-iOS устройств
                              console.log('Доступные методы:', Object.getOwnPropertyNames(Object.getPrototypeOf(stereoPlugin)))
                              
                              try {
                                console.log('Вызываем stereoPlugin.toggle()')
                                stereoPlugin.toggle()
                              } catch (e) {
                                console.error('Ошибка вызова toggle:', e)
                                
                                try {
                                  console.log('Пробуем вызвать stereoPlugin.enter()')
                                  stereoPlugin.enter()
                                } catch (e2) {
                                  console.error('Ошибка вызова enter:', e2)
                                  
                                  // Последняя попытка - симулируем клик
                                  console.log('Симулируем клик на оригинальной кнопке')
                                  const originalButton = document.querySelector('.psv-stereo-button')
                                  if (originalButton) {
                                    originalButton.dispatchEvent(new MouseEvent('click', {
                                      bubbles: true,
                                      cancelable: true,
                                      view: window
                                    }))
                                  }
                                }
                              }
                            }
                            
                            // Включаем полноэкранный режим для лучшего опыта
                            setTimeout(() => {
                              if (!document.fullscreenElement) {
                                container.requestFullscreen().catch(err => {
                                  console.warn(`Ошибка перехода в полноэкранный режим: ${err.message}`)
                                })
                              }
                              
                              // Активируем гироскоп для управления обзором
                              const gyroPlugin = viewer.getPlugin(GyroscopePlugin)
                              if (gyroPlugin && !gyroPlugin.isEnabled()) {
                                gyroPlugin.start()
                              }
                            }, 500)
                          } catch (e) {
                            console.error('Ошибка при активации мобильного VR режима:', e)
                          }
                          
                          return false
                        }
                      }
                    } catch (e) {
                      console.error('Ошибка активации стерео плагина:', e)
                    }
                  }
                }, 1000)
              }
            })
            .catch((err: Error) => console.error('Ошибка проверки VR поддержки:', err))
          } else {
            // Для мобильных устройств без WebXR просто показываем кнопку стерео
            if (isMobile) {
              setTimeout(() => {
                const stereoButton = document.querySelector('.psv-stereo-button')
                if (stereoButton) {
                  console.log('VR кнопка найдена и будет отображена для мобильного устройства')
                  (stereoButton as HTMLElement).classList.remove('psv-button--disabled')
                }
              }, 1000)
            }
          }
        } else {
          console.warn('WebXR не поддерживается в этом браузере и не мобильное устройство')
        }
      })
      
      viewer.addEventListener('panorama-loaded', () => {
        if (isMounted) {
          console.log('Panorama loaded event fired')
          setIsLoading(false)
        }
      })
      
      viewer.addEventListener('position-updated', () => {
        if (isMounted) {
          console.log('Position updated, setting loading to false')
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
      // Очищаем таймаут при размонтировании компонента
      clearTimeout(loadingTimeout)
      
      // Устанавливаем флаг, что компонент размонтирован
      isMounted = false
      
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [basePath, files, initialFov])

  return (
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
  )
}


