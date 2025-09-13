/**
 * Browser Compatibility Tests
 * Tests for browser detection and VR feature support across different platforms
 */

import { BrowserCompatibility } from '../BrowserCompatibility'
import { mockUserAgent, mockSecureContext, USER_AGENTS } from './mocks/PhotoSphereViewerMocks'

describe('BrowserCompatibility', () => {
  let compatibility: BrowserCompatibility
  let cleanupFunctions: (() => void)[] = []

  beforeEach(() => {
    compatibility = BrowserCompatibility.getInstance()
    compatibility.clearCache()
  })

  afterEach(() => {
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
    compatibility.clearCache()
  })

  describe('Browser Detection', () => {
    test('should detect iOS Safari correctly', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.name).toBe('Safari')
      expect(browser.platform).toBe('iOS')
      expect(browser.engine).toBe('WebKit')
      expect(browser.isMobile).toBe(true)
    })

    test('should detect Android Chrome correctly', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.name).toBe('Chrome')
      expect(browser.platform).toBe('Android')
      expect(browser.engine).toBe('Blink')
      expect(browser.isMobile).toBe(true)
    })

    test('should detect Desktop Chrome correctly', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.name).toBe('Chrome')
      expect(browser.platform).toBe('Desktop')
      expect(browser.engine).toBe('Blink')
      expect(browser.isMobile).toBe(false)
    })

    test('should detect Desktop Firefox correctly', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_FIREFOX)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.name).toBe('Firefox')
      expect(browser.platform).toBe('Desktop')
      expect(browser.engine).toBe('Gecko')
      expect(browser.isMobile).toBe(false)
    })

    test('should detect Desktop Safari correctly', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_SAFARI)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.name).toBe('Safari')
      expect(browser.platform).toBe('Desktop')
      expect(browser.engine).toBe('WebKit')
      expect(browser.isMobile).toBe(false)
    })

    test('should extract version numbers correctly', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      const restoreUserAgent = mockUserAgent(chromeUA)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()

      expect(browser.version).toBe('95.0')
    })
  })

  describe('Feature Detection', () => {
    test('should detect DeviceOrientationEvent support', () => {
      const features = compatibility.detectFeatureSupport()
      
      // DeviceOrientationEvent should be available in test environment
      expect(typeof features.deviceOrientation).toBe('boolean')
    })

    test('should detect fullscreen API support', () => {
      const features = compatibility.detectFeatureSupport()
      
      expect(typeof features.fullscreen).toBe('boolean')
    })

    test('should detect secure context', () => {
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreSecureContext)

      const features = compatibility.detectFeatureSupport()
      
      expect(features.secureContext).toBe(true)
    })

    test('should detect insecure context', () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const features = compatibility.detectFeatureSupport()
      
      expect(features.secureContext).toBe(false)
    })

    test('should detect gyroscope support on mobile devices', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const features = compatibility.detectFeatureSupport()
      
      // Mobile devices with DeviceOrientationEvent should have gyroscope support
      expect(features.gyroscope).toBe(true)
    })

    test('should not detect gyroscope support on desktop without permission API', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const features = compatibility.detectFeatureSupport()
      
      // Desktop without permission API should not have gyroscope support
      expect(features.gyroscope).toBe(false)
    })
  })

  describe('VR Support Assessment', () => {
    test('should assess full VR support for iOS Safari with permissions', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      // Mock DeviceOrientationEvent.requestPermission
      const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission
      ;(DeviceOrientationEvent as any).requestPermission = jest.fn()
      cleanupFunctions.push(() => {
        ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
      })

      const report = compatibility.getCompatibilityReport()
      
      expect(report.vrSupport).toBe('full')
    })

    test('should assess partial VR support for Android Chrome', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      const restoreSecureContext = mockSecureContext(true)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      
      expect(['full', 'partial']).toContain(report.vrSupport)
    })

    test('should assess limited VR support for insecure context', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreUserAgent, restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      
      expect(['limited', 'none']).toContain(report.vrSupport)
    })
  })

  describe('Compatibility Warnings', () => {
    test('should generate warning for insecure context', () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      
      expect(report.warnings).toContain(
        expect.stringContaining('Not running in secure context')
      )
    })

    test('should generate warning for missing DeviceOrientationEvent', () => {
      // Mock DeviceOrientationEvent as undefined
      const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
      ;(global as any).DeviceOrientationEvent = undefined
      cleanupFunctions.push(() => {
        ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
      })

      const report = compatibility.getCompatibilityReport()
      
      expect(report.warnings).toContain(
        expect.stringContaining('Device orientation not supported')
      )
    })

    test('should generate warning for iOS without permission API', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      // Ensure no permission API
      const originalRequestPermission = (DeviceOrientationEvent as any).requestPermission
      ;(DeviceOrientationEvent as any).requestPermission = undefined
      cleanupFunctions.push(() => {
        ;(DeviceOrientationEvent as any).requestPermission = originalRequestPermission
      })

      const report = compatibility.getCompatibilityReport()
      
      expect(report.warnings).toContain(
        expect.stringContaining('iOS permission API not available')
      )
    })
  })

  describe('Compatibility Recommendations', () => {
    test('should recommend HTTPS for insecure context', () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const report = compatibility.getCompatibilityReport()
      
      expect(report.recommendations).toContain(
        expect.stringContaining('Use HTTPS')
      )
    })

    test('should recommend iOS Safari 13+ for iOS devices', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const report = compatibility.getCompatibilityReport()
      
      expect(report.recommendations).toContain(
        expect.stringContaining('iOS Safari version 13+')
      )
    })

    test('should recommend Chrome for Android devices', () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const report = compatibility.getCompatibilityReport()
      
      expect(report.recommendations).toContain(
        expect.stringContaining('Chrome for Android')
      )
    })
  })

  describe('Browser Version Support', () => {
    test('should support modern Chrome versions', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      const restoreUserAgent = mockUserAgent(chromeUA)
      cleanupFunctions.push(restoreUserAgent)

      const isSupported = compatibility.isBrowserSupported()
      
      expect(isSupported).toBe(true)
    })

    test('should not support old Chrome versions', () => {
      const oldChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
      const restoreUserAgent = mockUserAgent(oldChromeUA)
      cleanupFunctions.push(restoreUserAgent)

      const isSupported = compatibility.isBrowserSupported()
      
      expect(isSupported).toBe(false)
    })

    test('should support modern Safari versions', () => {
      const safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15'
      const restoreUserAgent = mockUserAgent(safariUA)
      cleanupFunctions.push(restoreUserAgent)

      const isSupported = compatibility.isBrowserSupported()
      
      expect(isSupported).toBe(true)
    })

    test('should use custom minimum versions', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
      const restoreUserAgent = mockUserAgent(chromeUA)
      cleanupFunctions.push(restoreUserAgent)

      const isSupported = compatibility.isBrowserSupported({ 'Chrome': '90.0' })
      
      expect(isSupported).toBe(false)
    })
  })

  describe('Fallback Strategies', () => {
    test('should provide fallback strategies for missing features', () => {
      const restoreSecureContext = mockSecureContext(false)
      cleanupFunctions.push(restoreSecureContext)

      const strategies = compatibility.getFallbackStrategies()
      
      expect(strategies.secureContext).toContain('HTTPS')
    })

    test('should provide device orientation fallback', () => {
      // Mock DeviceOrientationEvent as undefined
      const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent
      ;(global as any).DeviceOrientationEvent = undefined
      cleanupFunctions.push(() => {
        ;(global as any).DeviceOrientationEvent = originalDeviceOrientationEvent
      })

      const strategies = compatibility.getFallbackStrategies()
      
      expect(strategies.deviceOrientation).toContain('mouse/touch controls')
    })
  })

  describe('Caching', () => {
    test('should cache compatibility report', () => {
      const report1 = compatibility.getCompatibilityReport()
      const report2 = compatibility.getCompatibilityReport()
      
      expect(report1).toBe(report2) // Same object reference
    })

    test('should clear cache when requested', () => {
      const report1 = compatibility.getCompatibilityReport()
      compatibility.clearCache()
      const report2 = compatibility.getCompatibilityReport()
      
      expect(report1).not.toBe(report2) // Different object references
    })
  })

  describe('Edge Cases', () => {
    test('should handle unknown browser gracefully', () => {
      const unknownUA = 'UnknownBrowser/1.0'
      const restoreUserAgent = mockUserAgent(unknownUA)
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()
      
      expect(browser.name).toBe('Unknown')
      expect(browser.version).toBe('Unknown')
    })

    test('should handle missing user agent', () => {
      const restoreUserAgent = mockUserAgent('')
      cleanupFunctions.push(restoreUserAgent)

      const browser = compatibility.detectBrowser()
      
      expect(browser.name).toBe('Unknown')
    })

    test('should handle version comparison edge cases', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95 Safari/537.36'
      const restoreUserAgent = mockUserAgent(chromeUA)
      cleanupFunctions.push(restoreUserAgent)

      // Should handle version without decimal point
      const isSupported = compatibility.isBrowserSupported({ 'Chrome': '90.0' })
      
      expect(typeof isSupported).toBe('boolean')
    })
  })
})