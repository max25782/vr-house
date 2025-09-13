/**
 * Browser Compatibility Detection and Feature Availability Checks
 * Provides comprehensive browser detection and VR feature support analysis
 */

export interface BrowserInfo {
  name: string
  version: string
  platform: 'iOS' | 'Android' | 'Desktop' | 'Unknown'
  engine: 'WebKit' | 'Blink' | 'Gecko' | 'Unknown'
  isMobile: boolean
}

export interface VRFeatureSupport {
  deviceOrientation: boolean
  deviceMotion: boolean
  fullscreen: boolean
  webXR: boolean
  gyroscope: boolean
  accelerometer: boolean
  secureContext: boolean
  permissions: boolean
}

export interface CompatibilityReport {
  browser: BrowserInfo
  features: VRFeatureSupport
  vrSupport: 'full' | 'partial' | 'limited' | 'none'
  warnings: string[]
  recommendations: string[]
}

export class BrowserCompatibility {
  private static instance: BrowserCompatibility
  private cachedReport: CompatibilityReport | null = null

  private constructor() {}

  static getInstance(): BrowserCompatibility {
    if (!BrowserCompatibility.instance) {
      BrowserCompatibility.instance = new BrowserCompatibility()
    }
    return BrowserCompatibility.instance
  }

  /**
   * Get comprehensive browser and feature compatibility report
   */
  getCompatibilityReport(): CompatibilityReport {
    if (this.cachedReport) {
      return this.cachedReport
    }

    const browser = this.detectBrowser()
    const features = this.detectFeatureSupport()
    const vrSupport = this.assessVRSupport(browser, features)
    const warnings = this.generateWarnings(browser, features)
    const recommendations = this.generateRecommendations(browser, features)

    this.cachedReport = {
      browser,
      features,
      vrSupport,
      warnings,
      recommendations
    }

    return this.cachedReport
  }

  /**
   * Detect browser information
   */
  detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent
    const platform = this.detectPlatform(userAgent)
    const engine = this.detectEngine(userAgent)
    const isMobile = this.detectMobile(userAgent)

    // Detect browser name and version
    let name = 'Unknown'
    let version = 'Unknown'

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome'
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari'
      const match = userAgent.match(/Version\/(\d+\.\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox'
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (userAgent.includes('Edg')) {
      name = 'Edge'
      const match = userAgent.match(/Edg\/(\d+\.\d+)/)
      version = match ? match[1] : 'Unknown'
    }

    return {
      name,
      version,
      platform,
      engine,
      isMobile
    }
  }

  /**
   * Detect platform from user agent
   */
  private detectPlatform(userAgent: string): BrowserInfo['platform'] {
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'iOS'
    } else if (/Android/i.test(userAgent)) {
      return 'Android'
    } else if (/Windows|Mac|Linux/i.test(userAgent)) {
      return 'Desktop'
    }
    return 'Unknown'
  }

  /**
   * Detect browser engine
   */
  private detectEngine(userAgent: string): BrowserInfo['engine'] {
    if (userAgent.includes('WebKit')) {
      if (userAgent.includes('Chrome') || userAgent.includes('Edg')) {
        return 'Blink'
      }
      return 'WebKit'
    } else if (userAgent.includes('Gecko') && userAgent.includes('Firefox')) {
      return 'Gecko'
    }
    return 'Unknown'
  }

  /**
   * Detect if device is mobile
   */
  private detectMobile(userAgent: string): boolean {
    return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)
  }

  /**
   * Detect VR feature support
   */
  detectFeatureSupport(): VRFeatureSupport {
    return {
      deviceOrientation: this.hasDeviceOrientationSupport(),
      deviceMotion: this.hasDeviceMotionSupport(),
      fullscreen: this.hasFullscreenSupport(),
      webXR: this.hasWebXRSupport(),
      gyroscope: this.hasGyroscopeSupport(),
      accelerometer: this.hasAccelerometerSupport(),
      secureContext: this.hasSecureContext(),
      permissions: this.hasPermissionsSupport()
    }
  }

  /**
   * Check DeviceOrientationEvent support
   */
  private hasDeviceOrientationSupport(): boolean {
    return typeof DeviceOrientationEvent !== 'undefined'
  }

  /**
   * Check DeviceMotionEvent support
   */
  private hasDeviceMotionSupport(): boolean {
    return typeof DeviceMotionEvent !== 'undefined'
  }

  /**
   * Check Fullscreen API support
   */
  private hasFullscreenSupport(): boolean {
    const element = document.documentElement
    return !!(
      element.requestFullscreen ||
      (element as any).webkitRequestFullscreen ||
      (element as any).mozRequestFullScreen ||
      (element as any).msRequestFullscreen
    )
  }

  /**
   * Check WebXR support
   */
  private hasWebXRSupport(): boolean {
    return 'xr' in navigator && 'isSessionSupported' in (navigator as any).xr
  }

  /**
   * Check gyroscope support (heuristic)
   */
  private hasGyroscopeSupport(): boolean {
    // Check for DeviceOrientationEvent and mobile device
    const hasDeviceOrientation = this.hasDeviceOrientationSupport()
    const isMobile = this.detectMobile(navigator.userAgent)
    
    // Additional checks for gyroscope indicators
    const hasPermissionAPI = typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    
    return hasDeviceOrientation && (isMobile || hasPermissionAPI)
  }

  /**
   * Check accelerometer support (heuristic)
   */
  private hasAccelerometerSupport(): boolean {
    return this.hasDeviceMotionSupport() && this.detectMobile(navigator.userAgent)
  }

  /**
   * Check secure context
   */
  private hasSecureContext(): boolean {
    return window.isSecureContext
  }

  /**
   * Check permissions API support
   */
  private hasPermissionsSupport(): boolean {
    return 'permissions' in navigator || typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  }

  /**
   * Assess overall VR support level
   */
  private assessVRSupport(browser: BrowserInfo, features: VRFeatureSupport): CompatibilityReport['vrSupport'] {
    // Full support: All key features available
    if (features.deviceOrientation && features.fullscreen && features.secureContext) {
      if (browser.platform === 'iOS' && features.permissions) {
        return 'full'
      } else if (browser.platform !== 'iOS') {
        return 'full'
      }
    }

    // Partial support: Some features missing but VR still possible
    if (features.deviceOrientation || features.fullscreen) {
      return 'partial'
    }

    // Limited support: Basic functionality only
    if (features.secureContext) {
      return 'limited'
    }

    // No support
    return 'none'
  }

  /**
   * Generate compatibility warnings
   */
  private generateWarnings(browser: BrowserInfo, features: VRFeatureSupport): string[] {
    const warnings: string[] = []

    if (!features.secureContext) {
      warnings.push('Not running in secure context (HTTPS) - some VR features may be limited')
    }

    if (!features.deviceOrientation) {
      warnings.push('Device orientation not supported - gyroscope functionality unavailable')
    }

    if (!features.fullscreen) {
      warnings.push('Fullscreen API not supported - immersive experience may be limited')
    }

    if (browser.platform === 'iOS' && !features.permissions) {
      warnings.push('iOS permission API not available - may not work on iOS 13+')
    }

    if (browser.name === 'Firefox' && browser.platform === 'Desktop') {
      warnings.push('Firefox desktop may have limited VR support')
    }

    if (browser.platform === 'Unknown') {
      warnings.push('Unknown platform detected - VR functionality may be unpredictable')
    }

    return warnings
  }

  /**
   * Generate compatibility recommendations
   */
  private generateRecommendations(browser: BrowserInfo, features: VRFeatureSupport): string[] {
    const recommendations: string[] = []

    if (!features.secureContext) {
      recommendations.push('Use HTTPS to enable full VR functionality')
    }

    if (browser.platform === 'iOS' && browser.name === 'Safari') {
      recommendations.push('Ensure iOS Safari version 13+ for best VR experience')
    }

    if (browser.platform === 'Android' && browser.name === 'Chrome') {
      recommendations.push('Chrome for Android provides excellent VR support')
    }

    if (browser.platform === 'Desktop') {
      recommendations.push('Desktop VR works best with Chrome or Edge browsers')
    }

    if (!features.gyroscope && browser.isMobile) {
      recommendations.push('Enable device motion permissions for enhanced VR experience')
    }

    return recommendations
  }

  /**
   * Check if specific browser/version combination is supported
   */
  isBrowserSupported(minVersions?: { [browserName: string]: string }): boolean {
    const browser = this.detectBrowser()
    
    if (!minVersions) {
      // Default minimum versions for VR support
      minVersions = {
        'Chrome': '60.0',
        'Safari': '13.0',
        'Firefox': '70.0',
        'Edge': '80.0'
      }
    }

    const minVersion = minVersions[browser.name]
    if (!minVersion) {
      return false // Unknown browser
    }

    return this.compareVersions(browser.version, minVersion) >= 0
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number)
    const v2parts = version2.split('.').map(Number)
    
    const maxLength = Math.max(v1parts.length, v2parts.length)
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0
      const v2part = v2parts[i] || 0
      
      if (v1part > v2part) return 1
      if (v1part < v2part) return -1
    }
    
    return 0
  }

  /**
   * Get fallback strategies for unsupported features
   */
  getFallbackStrategies(): { [feature: string]: string } {
    const features = this.detectFeatureSupport()
    const strategies: { [feature: string]: string } = {}

    if (!features.deviceOrientation) {
      strategies.deviceOrientation = 'Use mouse/touch controls for panorama navigation'
    }

    if (!features.fullscreen) {
      strategies.fullscreen = 'Maximize browser window for better immersion'
    }

    if (!features.gyroscope) {
      strategies.gyroscope = 'Use touch gestures for device orientation simulation'
    }

    if (!features.secureContext) {
      strategies.secureContext = 'Serve content over HTTPS for full functionality'
    }

    return strategies
  }

  /**
   * Clear cached compatibility report (useful for testing)
   */
  clearCache(): void {
    this.cachedReport = null
  }
}