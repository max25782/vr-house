/**
 * VR Fallback Implementations for Unsupported Browsers
 * Provides graceful degradation when VR features are not available
 */

import { BrowserCompatibility, VRFeatureSupport, BrowserInfo } from './BrowserCompatibility'

export interface FallbackConfig {
  enableMouseControls: boolean
  enableTouchControls: boolean
  enableKeyboardControls: boolean
  showCompatibilityWarnings: boolean
  autoDetectFallbacks: boolean
}

export interface FallbackImplementation {
  name: string
  description: string
  isAvailable: boolean
  activate: () => Promise<void>
  deactivate: () => Promise<void>
}

export class VRFallbacks {
  private compatibility: BrowserCompatibility
  private config: FallbackConfig
  private activeFallbacks: Set<string> = new Set()

  constructor(config: Partial<FallbackConfig> = {}) {
    this.compatibility = BrowserCompatibility.getInstance()
    this.config = {
      enableMouseControls: true,
      enableTouchControls: true,
      enableKeyboardControls: true,
      showCompatibilityWarnings: true,
      autoDetectFallbacks: true,
      ...config
    }
  }

  /**
   * Get available fallback implementations based on browser capabilities
   */
  getAvailableFallbacks(): FallbackImplementation[] {
    const report = this.compatibility.getCompatibilityReport()
    const fallbacks: FallbackImplementation[] = []

    // Device Orientation Fallback
    if (!report.features.deviceOrientation) {
      fallbacks.push(this.createDeviceOrientationFallback(report.browser))
    }

    // Fullscreen Fallback
    if (!report.features.fullscreen) {
      fallbacks.push(this.createFullscreenFallback())
    }

    // Gyroscope Fallback
    if (!report.features.gyroscope) {
      fallbacks.push(this.createGyroscopeFallback(report.browser))
    }

    // Permission Fallback
    if (!report.features.permissions && report.browser.platform === 'iOS') {
      fallbacks.push(this.createPermissionFallback())
    }

    // Secure Context Fallback
    if (!report.features.secureContext) {
      fallbacks.push(this.createSecureContextFallback())
    }

    return fallbacks
  }

  /**
   * Create device orientation fallback
   */
  private createDeviceOrientationFallback(browser: BrowserInfo): FallbackImplementation {
    return {
      name: 'DeviceOrientationFallback',
      description: 'Mouse and touch controls for panorama navigation',
      isAvailable: true,
      activate: async () => {
        console.log('Activating device orientation fallback')
        
        if (browser.isMobile && this.config.enableTouchControls) {
          this.activateTouchControls()
        }
        
        if (!browser.isMobile && this.config.enableMouseControls) {
          this.activateMouseControls()
        }
        
        if (this.config.enableKeyboardControls) {
          this.activateKeyboardControls()
        }
        
        this.activeFallbacks.add('DeviceOrientationFallback')
      },
      deactivate: async () => {
        console.log('Deactivating device orientation fallback')
        this.deactivateAllControls()
        this.activeFallbacks.delete('DeviceOrientationFallback')
      }
    }
  }

  /**
   * Create fullscreen fallback
   */
  private createFullscreenFallback(): FallbackImplementation {
    return {
      name: 'FullscreenFallback',
      description: 'Maximize viewport and hide browser UI elements',
      isAvailable: true,
      activate: async () => {
        console.log('Activating fullscreen fallback')
        
        // Hide browser UI elements where possible
        this.hideUIElements()
        
        // Maximize viewport
        this.maximizeViewport()
        
        // Show user instructions
        if (this.config.showCompatibilityWarnings) {
          this.showFullscreenInstructions()
        }
        
        this.activeFallbacks.add('FullscreenFallback')
      },
      deactivate: async () => {
        console.log('Deactivating fullscreen fallback')
        this.restoreUIElements()
        this.restoreViewport()
        this.activeFallbacks.delete('FullscreenFallback')
      }
    }
  }

  /**
   * Create gyroscope fallback
   */
  private createGyroscopeFallback(browser: BrowserInfo): FallbackImplementation {
    return {
      name: 'GyroscopeFallback',
      description: 'Simulated device orientation using touch/mouse input',
      isAvailable: true,
      activate: async () => {
        console.log('Activating gyroscope fallback')
        
        if (browser.isMobile) {
          this.activateSimulatedGyroscope()
        } else {
          this.activateMouseGyroscope()
        }
        
        this.activeFallbacks.add('GyroscopeFallback')
      },
      deactivate: async () => {
        console.log('Deactivating gyroscope fallback')
        this.deactivateSimulatedGyroscope()
        this.activeFallbacks.delete('GyroscopeFallback')
      }
    }
  }

  /**
   * Create permission fallback
   */
  private createPermissionFallback(): FallbackImplementation {
    return {
      name: 'PermissionFallback',
      description: 'Alternative permission handling for older iOS versions',
      isAvailable: true,
      activate: async () => {
        console.log('Activating permission fallback')
        
        // For older iOS versions, assume permissions are granted
        // and provide user instructions
        if (this.config.showCompatibilityWarnings) {
          this.showPermissionInstructions()
        }
        
        this.activeFallbacks.add('PermissionFallback')
      },
      deactivate: async () => {
        console.log('Deactivating permission fallback')
        this.activeFallbacks.delete('PermissionFallback')
      }
    }
  }

  /**
   * Create secure context fallback
   */
  private createSecureContextFallback(): FallbackImplementation {
    return {
      name: 'SecureContextFallback',
      description: 'Limited VR functionality without HTTPS',
      isAvailable: true,
      activate: async () => {
        console.log('Activating secure context fallback')
        
        if (this.config.showCompatibilityWarnings) {
          this.showSecureContextWarning()
        }
        
        // Enable basic VR functionality without secure-context-dependent features
        this.activateBasicVRMode()
        
        this.activeFallbacks.add('SecureContextFallback')
      },
      deactivate: async () => {
        console.log('Deactivating secure context fallback')
        this.deactivateBasicVRMode()
        this.activeFallbacks.delete('SecureContextFallback')
      }
    }
  }

  /**
   * Activate touch controls for mobile devices
   */
  private activateTouchControls(): void {
    // Implementation would depend on the specific panorama viewer
    console.log('Touch controls activated')
    
    // Example: Add touch event listeners for panorama navigation
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
  }

  /**
   * Activate mouse controls for desktop
   */
  private activateMouseControls(): void {
    console.log('Mouse controls activated')
    
    // Example: Add mouse event listeners for panorama navigation
    document.addEventListener('mousedown', this.handleMouseDown.bind(this))
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
    document.addEventListener('mouseup', this.handleMouseUp.bind(this))
    document.addEventListener('wheel', this.handleWheel.bind(this))
  }

  /**
   * Activate keyboard controls
   */
  private activateKeyboardControls(): void {
    console.log('Keyboard controls activated')
    
    // Example: Add keyboard event listeners for panorama navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
  }

  /**
   * Deactivate all control fallbacks
   */
  private deactivateAllControls(): void {
    // Remove touch event listeners
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    
    // Remove mouse event listeners
    document.removeEventListener('mousedown', this.handleMouseDown.bind(this))
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this))
    document.removeEventListener('wheel', this.handleWheel.bind(this))
    
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('keyup', this.handleKeyUp.bind(this))
  }

  /**
   * Hide browser UI elements for fullscreen fallback
   */
  private hideUIElements(): void {
    // Add CSS to hide scrollbars and maximize viewport
    const style = document.createElement('style')
    style.id = 'vr-fallback-fullscreen'
    style.textContent = `
      body.vr-fallback-fullscreen {
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .vr-fallback-fullscreen .vr-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
      }
    `
    document.head.appendChild(style)
    document.body.classList.add('vr-fallback-fullscreen')
  }

  /**
   * Restore browser UI elements
   */
  private restoreUIElements(): void {
    const style = document.getElementById('vr-fallback-fullscreen')
    if (style) {
      style.remove()
    }
    document.body.classList.remove('vr-fallback-fullscreen')
  }

  /**
   * Maximize viewport for fullscreen fallback
   */
  private maximizeViewport(): void {
    // Set viewport meta tag for mobile devices
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.name = 'viewport'
      document.head.appendChild(viewport)
    }
    
    viewport.setAttribute('data-original-content', viewport.content)
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
  }

  /**
   * Restore original viewport
   */
  private restoreViewport(): void {
    const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    if (viewport) {
      const originalContent = viewport.getAttribute('data-original-content')
      if (originalContent) {
        viewport.content = originalContent
        viewport.removeAttribute('data-original-content')
      }
    }
  }

  /**
   * Activate simulated gyroscope for mobile
   */
  private activateSimulatedGyroscope(): void {
    console.log('Simulated gyroscope activated for mobile')
    // Implementation would simulate device orientation based on touch input
  }

  /**
   * Activate mouse-based gyroscope simulation
   */
  private activateMouseGyroscope(): void {
    console.log('Mouse-based gyroscope simulation activated')
    // Implementation would simulate device orientation based on mouse movement
  }

  /**
   * Deactivate simulated gyroscope
   */
  private deactivateSimulatedGyroscope(): void {
    console.log('Simulated gyroscope deactivated')
  }

  /**
   * Activate basic VR mode without secure context features
   */
  private activateBasicVRMode(): void {
    console.log('Basic VR mode activated (no secure context)')
    // Enable VR features that don't require secure context
  }

  /**
   * Deactivate basic VR mode
   */
  private deactivateBasicVRMode(): void {
    console.log('Basic VR mode deactivated')
  }

  /**
   * Show user instructions for fullscreen
   */
  private showFullscreenInstructions(): void {
    console.log('Showing fullscreen instructions')
    // Could show a modal or notification with instructions
  }

  /**
   * Show user instructions for permissions
   */
  private showPermissionInstructions(): void {
    console.log('Showing permission instructions')
    // Could show instructions for manually enabling device orientation
  }

  /**
   * Show secure context warning
   */
  private showSecureContextWarning(): void {
    console.log('Showing secure context warning')
    // Could show warning about limited functionality without HTTPS
  }

  /**
   * Event handlers for fallback controls
   */
  private handleTouchStart(event: TouchEvent): void {
    // Implementation for touch start
  }

  private handleTouchMove(event: TouchEvent): void {
    // Implementation for touch move
  }

  private handleTouchEnd(event: TouchEvent): void {
    // Implementation for touch end
  }

  private handleMouseDown(event: MouseEvent): void {
    // Implementation for mouse down
  }

  private handleMouseMove(event: MouseEvent): void {
    // Implementation for mouse move
  }

  private handleMouseUp(event: MouseEvent): void {
    // Implementation for mouse up
  }

  private handleWheel(event: WheelEvent): void {
    // Implementation for wheel/scroll
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Implementation for key down (arrow keys, WASD, etc.)
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Implementation for key up
  }

  /**
   * Check if any fallbacks are currently active
   */
  hasActiveFallbacks(): boolean {
    return this.activeFallbacks.size > 0
  }

  /**
   * Get list of active fallback names
   */
  getActiveFallbacks(): string[] {
    return Array.from(this.activeFallbacks)
  }

  /**
   * Activate all recommended fallbacks based on browser capabilities
   */
  async activateRecommendedFallbacks(): Promise<void> {
    if (!this.config.autoDetectFallbacks) {
      return
    }

    const fallbacks = this.getAvailableFallbacks()
    
    for (const fallback of fallbacks) {
      if (fallback.isAvailable) {
        try {
          await fallback.activate()
          console.log(`Activated fallback: ${fallback.name}`)
        } catch (error) {
          console.warn(`Failed to activate fallback ${fallback.name}:`, error)
        }
      }
    }
  }

  /**
   * Deactivate all active fallbacks
   */
  async deactivateAllFallbacks(): Promise<void> {
    const fallbacks = this.getAvailableFallbacks()
    
    for (const fallback of fallbacks) {
      if (this.activeFallbacks.has(fallback.name)) {
        try {
          await fallback.deactivate()
          console.log(`Deactivated fallback: ${fallback.name}`)
        } catch (error) {
          console.warn(`Failed to deactivate fallback ${fallback.name}:`, error)
        }
      }
    }
  }
}