/**
 * Simple Browser Compatibility Tests
 * Basic tests to verify browser compatibility functionality
 */

import { BrowserCompatibility } from '../BrowserCompatibility'

describe('BrowserCompatibility - Simple Tests', () => {
  let compatibility: BrowserCompatibility

  beforeEach(() => {
    compatibility = BrowserCompatibility.getInstance()
    compatibility.clearCache()
  })

  afterEach(() => {
    compatibility.clearCache()
  })

  test('should create instance', () => {
    expect(compatibility).toBeDefined()
  })

  test('should detect browser information', () => {
    const browser = compatibility.detectBrowser()
    
    expect(browser).toBeDefined()
    expect(browser.name).toBeDefined()
    expect(browser.platform).toBeDefined()
    expect(browser.engine).toBeDefined()
    expect(typeof browser.isMobile).toBe('boolean')
  })

  test('should detect feature support', () => {
    const features = compatibility.detectFeatureSupport()
    
    expect(features).toBeDefined()
    expect(typeof features.deviceOrientation).toBe('boolean')
    expect(typeof features.deviceMotion).toBe('boolean')
    expect(typeof features.fullscreen).toBe('boolean')
    expect(typeof features.webXR).toBe('boolean')
    expect(typeof features.gyroscope).toBe('boolean')
    expect(typeof features.accelerometer).toBe('boolean')
    expect(typeof features.secureContext).toBe('boolean')
    expect(typeof features.permissions).toBe('boolean')
  })

  test('should generate compatibility report', () => {
    const report = compatibility.getCompatibilityReport()
    
    expect(report).toBeDefined()
    expect(report.browser).toBeDefined()
    expect(report.features).toBeDefined()
    expect(['full', 'partial', 'limited', 'none']).toContain(report.vrSupport)
    expect(Array.isArray(report.warnings)).toBe(true)
    expect(Array.isArray(report.recommendations)).toBe(true)
  })

  test('should provide fallback strategies', () => {
    const strategies = compatibility.getFallbackStrategies()
    
    expect(strategies).toBeDefined()
    expect(typeof strategies).toBe('object')
  })

  test('should check browser support', () => {
    const isSupported = compatibility.isBrowserSupported()
    
    expect(typeof isSupported).toBe('boolean')
  })

  test('should cache reports', () => {
    const report1 = compatibility.getCompatibilityReport()
    const report2 = compatibility.getCompatibilityReport()
    
    expect(report1).toBe(report2) // Same object reference
  })

  test('should clear cache', () => {
    const report1 = compatibility.getCompatibilityReport()
    compatibility.clearCache()
    const report2 = compatibility.getCompatibilityReport()
    
    expect(report1).not.toBe(report2) // Different object references
  })
})