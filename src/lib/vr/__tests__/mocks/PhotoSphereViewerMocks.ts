/**
 * Mock implementations for Photo Sphere Viewer plugins
 * Used in integration and unit tests
 */

export interface MockStereoPlugin {
  toggle: jest.Mock
  enter: jest.Mock
  exit: jest.Mock
  isEnabled: jest.Mock
  destroy: jest.Mock
}

export interface MockGyroscopePlugin {
  start: jest.Mock
  stop: jest.Mock
  isEnabled: jest.Mock
  destroy: jest.Mock
}

export interface MockViewer {
  getPlugin: jest.Mock
  destroy: jest.Mock
  addEventListener: jest.Mock
  removeEventListener: jest.Mock
  getContainer: jest.Mock
  getSize: jest.Mock
  resize: jest.Mock
}

/**
 * Create a mock stereo plugin with configurable behavior
 */
export function createMockStereoPlugin(options: {
  shouldFailToggle?: boolean
  shouldFailEnter?: boolean
  shouldFailExit?: boolean
  hasToggleMethod?: boolean
  hasEnterMethod?: boolean
  hasExitMethod?: boolean
} = {}): MockStereoPlugin {
  const {
    shouldFailToggle = false,
    shouldFailEnter = false,
    shouldFailExit = false,
    hasToggleMethod = true,
    hasEnterMethod = true,
    hasExitMethod = true,
  } = options

  const plugin: Partial<MockStereoPlugin> = {
    isEnabled: jest.fn().mockReturnValue(false),
    destroy: jest.fn(),
  }

  if (hasToggleMethod) {
    plugin.toggle = jest.fn().mockImplementation(() => {
      if (shouldFailToggle) {
        throw new Error('Stereo toggle failed')
      }
    })
  }

  if (hasEnterMethod) {
    plugin.enter = jest.fn().mockImplementation(() => {
      if (shouldFailEnter) {
        throw new Error('Stereo enter failed')
      }
    })
  }

  if (hasExitMethod) {
    plugin.exit = jest.fn().mockImplementation(() => {
      if (shouldFailExit) {
        throw new Error('Stereo exit failed')
      }
    })
  }

  return plugin as MockStereoPlugin
}

/**
 * Create a mock gyroscope plugin with configurable behavior
 */
export function createMockGyroscopePlugin(options: {
  shouldFailStart?: boolean
  shouldFailStop?: boolean
  initiallyEnabled?: boolean
} = {}): MockGyroscopePlugin {
  const {
    shouldFailStart = false,
    shouldFailStop = false,
    initiallyEnabled = false,
  } = options

  let isEnabled = initiallyEnabled

  return {
    start: jest.fn().mockImplementation(() => {
      if (shouldFailStart) {
        throw new Error('Gyroscope start failed')
      }
      isEnabled = true
    }),
    stop: jest.fn().mockImplementation(() => {
      if (shouldFailStop) {
        throw new Error('Gyroscope stop failed')
      }
      isEnabled = false
    }),
    isEnabled: jest.fn().mockImplementation(() => isEnabled),
    destroy: jest.fn(),
  }
}

/**
 * Create a mock Photo Sphere Viewer with configurable plugins
 */
export function createMockViewer(options: {
  stereoPlugin?: MockStereoPlugin | null
  gyroscopePlugin?: MockGyroscopePlugin | null
  shouldFailGetPlugin?: boolean
} = {}): MockViewer {
  const {
    stereoPlugin = createMockStereoPlugin(),
    gyroscopePlugin = createMockGyroscopePlugin(),
    shouldFailGetPlugin = false,
  } = options

  const mockContainer = document.createElement('div')
  mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)

  return {
    getPlugin: jest.fn().mockImplementation((pluginClass) => {
      if (shouldFailGetPlugin) {
        throw new Error('Failed to get plugin')
      }

      if (pluginClass === 'StereoPlugin' || pluginClass.name === 'StereoPlugin') {
        return stereoPlugin
      }
      if (pluginClass === 'GyroscopePlugin' || pluginClass.name === 'GyroscopePlugin') {
        return gyroscopePlugin
      }
      return null
    }),
    destroy: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getContainer: jest.fn().mockReturnValue(mockContainer),
    getSize: jest.fn().mockReturnValue({ width: 800, height: 600 }),
    resize: jest.fn(),
  }
}

/**
 * Mock device orientation permission responses
 */
export function mockDeviceOrientationPermission(response: 'granted' | 'denied' | 'default' | 'timeout') {
  const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission

  if (response === 'timeout') {
    ;(DeviceOrientationEvent as any).requestPermission = jest.fn().mockImplementation(
      () => new Promise((resolve) => {
        // Never resolve to simulate timeout
      })
    )
  } else {
    ;(DeviceOrientationEvent as any).requestPermission = jest.fn().mockResolvedValue(response)
  }

  return () => {
    ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
  }
}

/**
 * Mock user agent for different devices
 */
export function mockUserAgent(userAgent: string) {
  const originalUserAgent = navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: userAgent,
  })

  return () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent,
    })
  }
}

/**
 * Common user agent strings for testing
 */
export const USER_AGENTS = {
  // iOS devices
  IPHONE: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  IPHONE_OLD: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
  IPHONE_NEW: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  IPAD: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  
  // Android devices
  ANDROID_CHROME: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
  ANDROID_CHROME_OLD: 'Mozilla/5.0 (Linux; Android 8.0; SM-G950F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
  ANDROID_FIREFOX: 'Mozilla/5.0 (Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
  ANDROID_SAMSUNG: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/13.0 Chrome/83.0.4103.106 Mobile Safari/537.36',
  
  // Desktop browsers
  DESKTOP_CHROME: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  DESKTOP_CHROME_OLD: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
  DESKTOP_FIREFOX: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  DESKTOP_FIREFOX_OLD: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0',
  DESKTOP_SAFARI: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  DESKTOP_SAFARI_OLD: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Safari/605.1.15',
  DESKTOP_EDGE: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  
  // Unusual/Edge cases
  UNKNOWN_BROWSER: 'UnknownBrowser/1.0',
  EMPTY_UA: '',
  BOT_UA: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}

/**
 * Mock fullscreen API availability
 */
export function mockFullscreenAPI(available: boolean) {
  const mockContainer = document.createElement('div')
  
  if (available) {
    mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: jest.fn().mockResolvedValue(undefined),
    })
  } else {
    mockContainer.requestFullscreen = undefined
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: undefined,
    })
  }

  return mockContainer
}

/**
 * Mock secure context
 */
export function mockSecureContext(isSecure: boolean) {
  const originalIsSecureContext = window.isSecureContext
  Object.defineProperty(window, 'isSecureContext', {
    writable: true,
    value: isSecure,
  })

  return () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: originalIsSecureContext,
    })
  }
}

/**
 * Mock WebXR support
 */
export function mockWebXRSupport(isSupported: boolean) {
  const originalXR = (navigator as any).xr
  
  if (isSupported) {
    ;(navigator as any).xr = {
      isSessionSupported: jest.fn().mockResolvedValue(true),
      requestSession: jest.fn().mockResolvedValue({}),
    }
  } else {
    ;(navigator as any).xr = undefined
  }

  return () => {
    ;(navigator as any).xr = originalXR
  }
}

/**
 * Mock DeviceMotionEvent support
 */
export function mockDeviceMotionEvent(isSupported: boolean) {
  const originalDeviceMotionEvent = (global as any).DeviceMotionEvent
  
  if (isSupported) {
    ;(global as any).DeviceMotionEvent = class MockDeviceMotionEvent extends Event {
      acceleration: any = null
      accelerationIncludingGravity: any = null
      rotationRate: any = null
      interval: number = 16
    }
  } else {
    ;(global as any).DeviceMotionEvent = undefined
  }

  return () => {
    ;(global as any).DeviceMotionEvent = originalDeviceMotionEvent
  }
}

/**
 * Mock browser-specific fullscreen APIs
 */
export function mockBrowserSpecificFullscreenAPI(browser: 'webkit' | 'moz' | 'ms' | 'standard' | 'none') {
  const element = document.documentElement
  const originalMethods = {
    requestFullscreen: element.requestFullscreen,
    webkitRequestFullscreen: (element as any).webkitRequestFullscreen,
    mozRequestFullScreen: (element as any).mozRequestFullScreen,
    msRequestFullscreen: (element as any).msRequestFullscreen,
  }

  // Clear all methods first
  ;(element as any).requestFullscreen = undefined
  ;(element as any).webkitRequestFullscreen = undefined
  ;(element as any).mozRequestFullScreen = undefined
  ;(element as any).msRequestFullscreen = undefined

  // Set the appropriate method based on browser
  switch (browser) {
    case 'standard':
      ;(element as any).requestFullscreen = jest.fn().mockResolvedValue(undefined)
      break
    case 'webkit':
      ;(element as any).webkitRequestFullscreen = jest.fn().mockResolvedValue(undefined)
      break
    case 'moz':
      ;(element as any).mozRequestFullScreen = jest.fn().mockResolvedValue(undefined)
      break
    case 'ms':
      ;(element as any).msRequestFullscreen = jest.fn().mockResolvedValue(undefined)
      break
    case 'none':
      // All methods remain undefined
      break
  }

  return () => {
    ;(element as any).requestFullscreen = originalMethods.requestFullscreen
    ;(element as any).webkitRequestFullscreen = originalMethods.webkitRequestFullscreen
    ;(element as any).mozRequestFullScreen = originalMethods.mozRequestFullScreen
    ;(element as any).msRequestFullscreen = originalMethods.msRequestFullscreen
  }
}

/**
 * Mock network conditions
 */
export function mockNetworkConditions(conditions: {
  online?: boolean
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  downlink?: number
  rtt?: number
}) {
  const originalOnLine = navigator.onLine
  const originalConnection = (navigator as any).connection

  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: conditions.online ?? true,
  })

  if (conditions.effectiveType || conditions.downlink || conditions.rtt) {
    ;(navigator as any).connection = {
      effectiveType: conditions.effectiveType || '4g',
      downlink: conditions.downlink || 10,
      rtt: conditions.rtt || 100,
    }
  }

  return () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    })
    ;(navigator as any).connection = originalConnection
  }
}

/**
 * Mock viewport dimensions
 */
export function mockViewportDimensions(width: number, height: number) {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    value: height,
  })

  return () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: originalInnerHeight,
    })
  }
}

/**
 * Create a comprehensive browser environment mock
 */
export function mockBrowserEnvironment(config: {
  userAgent: string
  secureContext: boolean
  hasDeviceOrientation?: boolean
  hasDeviceMotion?: boolean
  hasWebXR?: boolean
  fullscreenAPI?: 'webkit' | 'moz' | 'ms' | 'standard' | 'none'
  permissionResponse?: 'granted' | 'denied' | 'default' | 'timeout'
  networkConditions?: {
    online?: boolean
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  }
  viewport?: { width: number; height: number }
}) {
  const cleanupFunctions: (() => void)[] = []

  // Mock user agent
  cleanupFunctions.push(mockUserAgent(config.userAgent))

  // Mock secure context
  cleanupFunctions.push(mockSecureContext(config.secureContext))

  // Mock device orientation
  if (config.hasDeviceOrientation === false) {
    const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
    ;(global as any).DeviceOrientationEvent = undefined
    cleanupFunctions.push(() => {
      ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
    })
  } else if (config.permissionResponse) {
    cleanupFunctions.push(mockDeviceOrientationPermission(config.permissionResponse))
  }

  // Mock device motion
  if (config.hasDeviceMotion !== undefined) {
    cleanupFunctions.push(mockDeviceMotionEvent(config.hasDeviceMotion))
  }

  // Mock WebXR
  if (config.hasWebXR !== undefined) {
    cleanupFunctions.push(mockWebXRSupport(config.hasWebXR))
  }

  // Mock fullscreen API
  if (config.fullscreenAPI) {
    cleanupFunctions.push(mockBrowserSpecificFullscreenAPI(config.fullscreenAPI))
  }

  // Mock network conditions
  if (config.networkConditions) {
    cleanupFunctions.push(mockNetworkConditions(config.networkConditions))
  }

  // Mock viewport
  if (config.viewport) {
    cleanupFunctions.push(mockViewportDimensions(config.viewport.width, config.viewport.height))
  }

  return () => {
    cleanupFunctions.forEach(cleanup => cleanup())
  }
}