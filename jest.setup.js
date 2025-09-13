import '@testing-library/jest-dom'

// Mock Photo Sphere Viewer
global.PhotoSphereViewer = {
  Viewer: jest.fn(),
  StereoPlugin: jest.fn(),
  GyroscopePlugin: jest.fn(),
  AutorotatePlugin: jest.fn(),
  CubemapAdapter: jest.fn(),
}

// Mock browser APIs
Object.defineProperty(window, 'DeviceOrientationEvent', {
  writable: true,
  value: {
    requestPermission: jest.fn(),
  },
})

Object.defineProperty(window, 'DeviceMotionEvent', {
  writable: true,
  value: {
    requestPermission: jest.fn(),
  },
})

// Mock fullscreen API
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

// Mock HTMLElement fullscreen methods
HTMLElement.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined)
HTMLElement.prototype.webkitRequestFullscreen = jest.fn().mockResolvedValue(undefined)
HTMLElement.prototype.mozRequestFullScreen = jest.fn().mockResolvedValue(undefined)
HTMLElement.prototype.msRequestFullscreen = jest.fn().mockResolvedValue(undefined)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock window.isSecureContext
Object.defineProperty(window, 'isSecureContext', {
  writable: true,
  value: true,
})

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Suppress specific console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})