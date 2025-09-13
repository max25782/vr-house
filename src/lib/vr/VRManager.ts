/**
 * VRManager - Centralized VR state management class
 * Handles VR activation, permission requests, and error recovery
 */

import { VRState, VRManagerConfig, VRError, VRStatus, PermissionStatus, VRErrorCategory } from './types'
import { VRErrorHandler, VRErrorHandlerConfig } from './VRErrorHandler'
import { VRLogger } from './VRLogger'
import { BrowserCompatibility } from './BrowserCompatibility'

export class VRManager {
  private state: VRState
  private config: VRManagerConfig
  private timeouts: Set<NodeJS.Timeout>
  private isDestroyed: boolean = false
  private errorHandler: VRErrorHandler
  private logger: VRLogger
  private sessionId: string

  constructor(config: VRManagerConfig) {
    this.config = config
    this.timeouts = new Set()
    this.state = {
      status: 'idle',
      permissionStatus: 'unknown'
    }
    
    // Initialize error handler
    const errorHandlerConfig: VRErrorHandlerConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      enableDetailedLogging: true,
      onError: (error) => this.onErrorOccurred(error),
      onRecovery: (strategy, success) => this.onRecoveryAttempted(strategy, success)
    }
    this.errorHandler = new VRErrorHandler(errorHandlerConfig)
    
    // Initialize logger
    this.logger = new VRLogger({
      enableConsoleOutput: true,
      enableStorage: true,
      maxStoredEntries: 1000,
      logLevel: 'info',
      includeStackTrace: true
    })
    
    // Generate session ID
    this.sessionId = `vr-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Set logger context
    this.logger.setContext({
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
    
    this.logger.logSessionStart(this.sessionId, navigator.userAgent, {
      isIOS: this.detectIOSDevice(),
      hasDeviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
      isSecureContext: window.isSecureContext
    })
    
    this.logger.info('Manager', 'VRManager initialized')
  }

  /**
   * Get current VR state
   */
  getState(): VRState {
    return { ...this.state }
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PermissionStatus {
    return this.state.permissionStatus
  }

  /**
   * Reset permission status (useful for testing or manual permission retry)
   */
  resetPermissionStatus(): void {
    this.log('Resetting permission status')
    this.updateState({ permissionStatus: 'unknown' })
  }

  /**
   * Check if permissions are required for this device
   */
  arePermissionsRequired(): boolean {
    return this.detectIOSDevice() && typeof DeviceOrientationEvent !== 'undefined' && 
           typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  }

  /**
   * Enhanced iOS device detection (public method)
   */
  detectIOSDevice(): boolean {
    const userAgent = navigator.userAgent
    const isIOSUserAgent = /iPhone|iPad|iPod/i.test(userAgent)
    
    // Additional check for iOS 13+ which may not have the traditional user agent
    const isIOSStandalone = (window.navigator as any).standalone !== undefined
    const isSafariIOS = /Safari/i.test(userAgent) && /Mobile/i.test(userAgent)
    
    const isIOS = isIOSUserAgent || (isIOSStandalone && isSafariIOS)
    
    this.log(`Device detection - iOS: ${isIOS}, UserAgent: ${userAgent}`)
    return isIOS
  }

  /**
   * Activate VR mode with comprehensive error handling
   */
  async activateVR(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('VRManager has been destroyed')
    }

    if (this.state.status === 'requesting' || this.state.status === 'active') {
      this.log('VR activation already in progress or active')
      return
    }

    this.updateState({ status: 'requesting', error: undefined })

    try {
      // Check browser compatibility first
      this.checkBrowserCompatibility()
      
      // Request permissions first (this has its own timeout handling)
      const permissionGranted = await this.requestPermissions()

      if (!permissionGranted) {
        const error = this.createError('permission', 'Permission denied for VR activation', undefined, {
          permissionStatus: this.state.permissionStatus,
          isIOS: this.detectIOSDevice()
        })
        await this.handleError(error, {
          retryCallback: () => this.requestPermissions()
        })
        throw error
      }

      // Get stereo plugin with enhanced error handling
      this.log('Getting stereo plugin...')
      const stereoPlugin = this.getStereoPlugin()
      if (!stereoPlugin) {
        const error = this.createError('plugin', 'Stereo plugin not available or not properly initialized', undefined, {
          pluginName: this.config.stereoPlugin?.name || 'unknown',
          viewerState: this.config.viewer ? 'available' : 'unavailable'
        })
        await this.handleError(error, {
          reinitializeCallback: () => this.reinitializePlugins()
        })
        throw error
      }

      this.log('Stereo plugin found, activating VR mode...')
      // Activate VR mode with safe toggle
      try {
        await this.safeToggleStereoMode(stereoPlugin)
        this.log('Stereo mode activated successfully')
      } catch (stereoError) {
        this.log('Stereo mode activation failed, continuing with other VR features:', stereoError)
        // Continue with other VR features even if stereo fails
      }
      
      // Activate gyroscope with proper cleanup
      this.log('Activating gyroscope...')
      await this.activateGyroscopeWithCleanup()
      this.log('Gyroscope activated')
      
      // Request fullscreen with browser compatibility
      this.log('Requesting fullscreen...')
      await this.requestFullscreenWithCompatibility()
      this.log('Fullscreen requested')

      this.updateState({ status: 'active' })
      this.log('VR mode activated successfully')

    } catch (error) {
      // Ensure we always have a proper error object
      if (!error) {
        error = new Error('Unknown VR activation error')
      }
      
      let vrError: VRError
      
      if (error instanceof Error && (error as any).category) {
        // Already a VRError
        vrError = error as VRError
      } else {
        vrError = error instanceof Error 
          ? this.createError('plugin', `VR activation failed: ${error.message}`, error)
          : this.createError('plugin', 'Unknown VR activation error', undefined, { originalError: error })
      }
      
      // Handle the error (this updates state and logs)
      try {
        await this.handleError(vrError, {
          retryCallback: () => this.activateVR()
        })
      } catch (handleErrorException) {
        // If handleError fails, log it but continue with the original error
        this.log('Error in handleError:', handleErrorException)
      }
      
      throw vrError
    }
  }

  /**
   * Deactivate VR mode with comprehensive cleanup
   */
  async deactivateVR(): Promise<void> {
    if (this.isDestroyed) {
      return
    }

    this.log('Deactivating VR mode')

    try {
      // Deactivate stereo mode safely
      await this.safeDeactivateStereoMode()

      // Deactivate gyroscope with proper cleanup
      await this.deactivateGyroscopeWithCleanup()

      // Exit fullscreen with browser compatibility
      await this.exitFullscreenWithCompatibility()

      // Clear any remaining timeouts
      this.clearAllTimeouts()

      this.updateState({ status: 'idle' })
      this.log('VR mode deactivated successfully')

    } catch (error) {
      this.log('Error during VR deactivation:', error)
      // Still update state to idle even if deactivation had errors
      this.updateState({ status: 'idle' })
    }
  }

  /**
   * Toggle VR mode - activate if idle, deactivate if active
   */
  async toggleVR(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('VRManager has been destroyed')
    }

    const currentStatus = this.state.status

    try {
      if (currentStatus === 'idle') {
        await this.activateVR()
      } else if (currentStatus === 'active') {
        await this.deactivateVR()
      } else if (currentStatus === 'requesting') {
        this.log('VR activation already in progress')
        return // Don't throw, just return
      } else if (currentStatus === 'error') {
        this.log('Attempting to activate VR after error state')
        // Reset error state and try to activate
        this.updateState({ status: 'idle', error: undefined })
        await this.activateVR()
      }
    } catch (error) {
      // Ensure we always have a proper error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown VR toggle error'
      this.log('Toggle VR failed:', errorMessage)
      
      // Re-throw with a proper error
      throw new Error(errorMessage)
    }
  }

  /**
   * Request necessary permissions for VR with enhanced error handling and caching
   */
  async requestPermissions(): Promise<boolean> {
    // Return cached permission status to prevent duplicate requests
    if (this.state.permissionStatus === 'granted') {
      this.log('Permission already granted (cached)')
      return true
    }

    if (this.state.permissionStatus === 'denied') {
      this.log('Permission already denied (cached)')
      return false
    }

    try {
      const isIOS = this.detectIOSDevice()
      
      if (isIOS) {
        return await this.requestIOSGyroscopePermission()
      } else {
        return this.handleNonIOSPermissions()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown permission error'
      this.log('Permission request error:', errorMessage, error)
      this.updateState({ permissionStatus: 'denied' })
      return false
    }
  }



  /**
   * Handle iOS gyroscope permission request with comprehensive error handling
   */
  private async requestIOSGyroscopePermission(): Promise<boolean> {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.logger.warn('Permissions', 'DeviceOrientationEvent not available on iOS device')
      this.updateState({ permissionStatus: 'denied' })
      throw this.createError('compatibility', 'DeviceOrientationEvent not supported', undefined, {
        platform: 'iOS',
        userAgent: navigator.userAgent
      })
    }

    // Check if permission request method is available (iOS 13+)
    const requestPermission = (DeviceOrientationEvent as any).requestPermission
    if (typeof requestPermission !== 'function') {
      this.log('DeviceOrientationEvent.requestPermission not available - likely iOS < 13')
      // For older iOS versions, assume permission is granted
      this.updateState({ permissionStatus: 'granted' })
      return true
    }

    try {
      this.log('Requesting iOS gyroscope permission')
      
      // Request permission without timeout - let the browser handle it
      const response = await requestPermission()
      
      this.log(`iOS permission response: ${response}`)
      
      if (response === 'granted') {
        this.updateState({ permissionStatus: 'granted' })
        this.log('iOS gyroscope permission granted')
        return true
      } else if (response === 'denied') {
        this.updateState({ permissionStatus: 'denied' })
        this.log('iOS gyroscope permission denied by user')
        return false
      } else {
        // Handle 'default' or other unexpected responses
        this.log(`Unexpected iOS permission response: ${response}`)
        this.updateState({ permissionStatus: 'denied' })
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown iOS permission error'
      this.log('iOS permission request failed:', errorMessage, error)
      
      // Determine if this is a timeout or other error
      if (errorMessage.includes('timeout')) {
        this.updateState({ permissionStatus: 'denied' })
        throw this.createError('timeout', 'iOS permission request timed out', error as Error, {
          platform: 'iOS',
          operation: 'permission_request'
        })
      } else {
        this.updateState({ permissionStatus: 'denied' })
        throw this.createError('permission', `iOS permission request failed: ${errorMessage}`, error as Error, {
          platform: 'iOS',
          operation: 'permission_request'
        })
      }
    }
  }

  /**
   * Handle permissions for non-iOS devices with fallback behavior
   */
  private handleNonIOSPermissions(): boolean {
    this.log('Handling permissions for non-iOS device')
    
    // Check if device orientation is supported
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.log('DeviceOrientationEvent not supported - VR will work without gyroscope')
      this.updateState({ permissionStatus: 'granted' })
      return true
    }

    // Check if we're in a secure context (required for some device APIs)
    if (!window.isSecureContext) {
      this.log('Warning: Not in secure context - some VR features may be limited')
    }

    // For Android and other devices, check if gyroscope is available
    if (this.isGyroscopeAvailable()) {
      this.log('Gyroscope detected on non-iOS device')
      this.updateState({ permissionStatus: 'granted' })
      return true
    } else {
      this.log('No gyroscope detected - VR will work in limited mode')
      this.updateState({ permissionStatus: 'granted' })
      return true
    }
  }

  /**
   * Check if gyroscope is available on the device
   */
  private isGyroscopeAvailable(): boolean {
    // Check for gyroscope support indicators
    const hasDeviceOrientationEvent = typeof DeviceOrientationEvent !== 'undefined'
    const hasDeviceMotionEvent = typeof DeviceMotionEvent !== 'undefined'
    
    // Check if the device has reported gyroscope capabilities
    const hasGyroscope = hasDeviceOrientationEvent || hasDeviceMotionEvent
    
    this.log(`Gyroscope availability check - DeviceOrientation: ${hasDeviceOrientationEvent}, DeviceMotion: ${hasDeviceMotionEvent}`)
    
    return hasGyroscope
  }

  /**
   * Get error handler for external access
   */
  getErrorHandler(): VRErrorHandler {
    return this.errorHandler
  }

  /**
   * Get logger for external access
   */
  getLogger(): VRLogger {
    return this.logger
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats()
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(minutes: number = 5) {
    return this.logger.getRecentLogs(minutes)
  }

  /**
   * Export diagnostic information
   */
  exportDiagnostics(): {
    sessionId: string
    state: VRState
    errorStats: any
    recentLogs: any[]
    recentErrors: any[]
  } {
    const errorStats = this.errorHandler.getErrorStats()
    
    return {
      sessionId: this.sessionId,
      state: this.getState(),
      errorStats,
      recentLogs: this.logger.getRecentLogs(10),
      recentErrors: errorStats.recentErrors
    }
  }

  /**
   * Clean up resources and event listeners
   */
  cleanup(): void {
    this.logger.info('Manager', 'Cleaning up VRManager')
    
    // Log session end
    const sessionDuration = Date.now() - parseInt(this.sessionId.split('-')[2])
    const errorStats = this.errorHandler.getErrorStats()
    this.logger.logSessionEnd(this.sessionId, sessionDuration, errorStats.totalErrors)
    
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
    
    // Clear error handler history
    this.errorHandler.clearErrorHistory()
    
    // Mark as destroyed
    this.isDestroyed = true
    
    // Reset state
    this.state = {
      status: 'idle',
      permissionStatus: 'unknown'
    }
  }

  /**
   * Private helper methods
   */

  private updateState(updates: Partial<VRState>): void {
    this.state = { ...this.state, ...updates }
    
    // Safely call the onStateChange callback with error handling
    try {
      const result = this.config.onStateChange(this.getState())
      
      // If the callback returns a promise, handle any rejections
      if (result && typeof result.then === 'function') {
        result.catch((error: any) => {
          this.log('Error in onStateChange callback:', error)
        })
      }
    } catch (error) {
      this.log('Error in onStateChange callback:', error)
    }
  }

  private getStereoPlugin(): any {
    try {
      if (!this.config.viewer) {
        this.log('Viewer not available')
        return null
      }
      
      if (!this.config.stereoPlugin) {
        this.log('Stereo plugin not configured')
        return null
      }
      
      this.log('Getting stereo plugin from viewer...')
      const plugin = this.config.viewer.getPlugin(this.config.stereoPlugin)
      this.log('Stereo plugin retrieved:', !!plugin)
      return plugin
    } catch (error) {
      this.log('Error getting stereo plugin:', error)
      return null
    }
  }

  private getGyroscopePlugin(): any {
    try {
      if (this.config.gyroscopePlugin) {
        return this.config.viewer.getPlugin(this.config.gyroscopePlugin)
      }
      return null
    } catch (error) {
      this.log('Error getting gyroscope plugin:', error)
      return null
    }
  }

  /**
   * Check browser compatibility for VR features using comprehensive compatibility system
   */
  private checkBrowserCompatibility(): void {
    const compatibility = BrowserCompatibility.getInstance()
    const report = compatibility.getCompatibilityReport()
    
    this.log('Browser compatibility report:', {
      browser: report.browser,
      vrSupport: report.vrSupport,
      warnings: report.warnings.length,
      recommendations: report.recommendations.length
    })
    
    // Log warnings
    if (report.warnings.length > 0) {
      report.warnings.forEach(warning => {
        this.logger.warn('Compatibility', warning)
      })
    }
    
    // Log recommendations
    if (report.recommendations.length > 0) {
      report.recommendations.forEach(recommendation => {
        this.logger.info('Compatibility', `Recommendation: ${recommendation}`)
      })
    }
    
    // Check if VR is supported at all
    if (report.vrSupport === 'none') {
      throw this.createError('compatibility', 'VR functionality is not supported in this browser environment', undefined, {
        browser: report.browser,
        features: report.features,
        warnings: report.warnings
      })
    }
    
    // For limited support, log additional warnings
    if (report.vrSupport === 'limited') {
      this.logger.warn('Compatibility', 'VR functionality is limited in this environment')
    }
    
    // Check for critical missing features
    if (report.browser.platform === 'iOS' && !report.features.deviceOrientation) {
      throw this.createError('compatibility', 'Device orientation not supported on this iOS device', undefined, {
        platform: 'iOS',
        browser: report.browser,
        features: report.features
      })
    }
  }

  /**
   * Safe stereo mode toggle with enhanced error handling
   */
  private async safeToggleStereoMode(stereoPlugin: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let isSettled = false
      
      try {
        this.log('Attempting to toggle stereo mode')
        
        // Set a timeout for the stereo toggle operation
        const toggleTimeout = setTimeout(() => {
          if (!isSettled) {
            isSettled = true
            reject(this.createError('timeout', 'Stereo mode toggle timeout', undefined, {
              operation: 'stereo_toggle',
              pluginAvailable: !!stereoPlugin
            }))
          }
        }, 1000) // Reduced to 1 second

        const clearTimeoutAndResolve = () => {
          if (!isSettled) {
            isSettled = true
            clearTimeout(toggleTimeout)
            this.timeouts.delete(toggleTimeout)
            resolve()
          }
        }

        const clearTimeoutAndReject = (error: VRError) => {
          if (!isSettled) {
            isSettled = true
            clearTimeout(toggleTimeout)
            this.timeouts.delete(toggleTimeout)
            reject(error)
          }
        }

        this.timeouts.add(toggleTimeout)

        if (typeof stereoPlugin.toggle === 'function') {
          try {
            this.log('Calling stereoPlugin.toggle()')
            stereoPlugin.toggle()
            // Give a small delay to ensure the toggle completes
            setTimeout(() => {
              try {
                clearTimeoutAndResolve()
              } catch (timeoutError) {
                this.log('Error in stereo toggle timeout:', timeoutError)
              }
            }, 100)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown stereo toggle error')
            this.log('Stereo toggle error:', errorMessage)
            clearTimeoutAndReject(this.createError('plugin', `Stereo toggle failed: ${errorMessage}`, error as Error, {
              operation: 'stereo_toggle',
              method: 'toggle'
            }))
          }
        } else if (typeof stereoPlugin.enter === 'function') {
          try {
            this.log('Calling stereoPlugin.enter()')
            stereoPlugin.enter()
            setTimeout(() => {
              try {
                clearTimeoutAndResolve()
              } catch (timeoutError) {
                this.log('Error in stereo enter timeout:', timeoutError)
              }
            }, 100)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown stereo enter error')
            this.log('Stereo enter error:', errorMessage)
            clearTimeoutAndReject(this.createError('plugin', `Stereo enter failed: ${errorMessage}`, error as Error, {
              operation: 'stereo_enter',
              method: 'enter'
            }))
          }
        } else {
          this.log('No stereo toggle/enter methods available, available methods:', Object.keys(stereoPlugin || {}))
          clearTimeoutAndReject(this.createError('plugin', 'Stereo plugin toggle/enter methods not available', undefined, {
            operation: 'stereo_activation',
            availableMethods: Object.keys(stereoPlugin || {})
          }))
        }
      } catch (error) {
        if (!isSettled) {
          isSettled = true
          reject(this.createError('plugin', `Stereo mode activation failed: ${error}`, error as Error, {
            operation: 'stereo_activation'
          }))
        }
      }
    })
  }

  /**
   * Safe stereo mode deactivation
   */
  private async safeDeactivateStereoMode(): Promise<void> {
    try {
      const stereoPlugin = this.getStereoPlugin()
      if (!stereoPlugin) {
        this.log('Stereo plugin not available for deactivation')
        return
      }

      if (typeof stereoPlugin.toggle === 'function') {
        stereoPlugin.toggle()
        this.log('Stereo mode deactivated via toggle')
      } else if (typeof stereoPlugin.exit === 'function') {
        stereoPlugin.exit()
        this.log('Stereo mode deactivated via exit')
      } else {
        this.log('No stereo deactivation method available')
      }
    } catch (error) {
      this.log('Error deactivating stereo mode:', error)
      // Don't throw - deactivation should be non-blocking
    }
  }

  /**
   * Activate gyroscope with proper cleanup tracking
   */
  private async activateGyroscopeWithCleanup(): Promise<void> {
    const gyroPlugin = this.getGyroscopePlugin()
    
    if (!gyroPlugin) {
      this.log('Gyroscope plugin not available')
      return
    }

    try {
      // Check if gyroscope is already enabled
      if (typeof gyroPlugin.isEnabled === 'function') {
        const isEnabled = gyroPlugin.isEnabled()
        this.log(`Gyroscope current state: ${isEnabled ? 'enabled' : 'disabled'}`)
        
        if (!isEnabled && typeof gyroPlugin.start === 'function') {
          this.log('Starting gyroscope')
          gyroPlugin.start()
          
          // Verify activation
          setTimeout(() => {
            try {
              if (typeof gyroPlugin.isEnabled === 'function' && gyroPlugin.isEnabled()) {
                this.log('Gyroscope activated successfully')
              } else {
                this.log('Gyroscope activation may have failed')
              }
            } catch (verifyError) {
              this.log('Error verifying gyroscope activation:', verifyError)
            }
          }, 500)
        } else if (isEnabled) {
          this.log('Gyroscope already active')
        }
      } else if (typeof gyroPlugin.start === 'function') {
        // Fallback for plugins without isEnabled method
        this.log('Starting gyroscope (no status check available)')
        gyroPlugin.start()
      }
    } catch (error) {
      this.log('Gyroscope activation error (non-critical):', error)
      // Don't throw - gyroscope is optional for VR functionality
    }
  }

  /**
   * Deactivate gyroscope with proper cleanup
   */
  private async deactivateGyroscopeWithCleanup(): Promise<void> {
    try {
      const gyroPlugin = this.getGyroscopePlugin()
      if (!gyroPlugin) {
        this.log('Gyroscope plugin not available for deactivation')
        return
      }

      // Check if gyroscope is enabled before trying to stop it
      if (typeof gyroPlugin.isEnabled === 'function') {
        const isEnabled = gyroPlugin.isEnabled()
        this.log(`Gyroscope state before deactivation: ${isEnabled ? 'enabled' : 'disabled'}`)
        
        if (isEnabled && typeof gyroPlugin.stop === 'function') {
          gyroPlugin.stop()
          this.log('Gyroscope deactivated')
        }
      } else if (typeof gyroPlugin.stop === 'function') {
        // Fallback for plugins without isEnabled method
        gyroPlugin.stop()
        this.log('Gyroscope deactivated (no status check available)')
      }
    } catch (error) {
      this.log('Error deactivating gyroscope:', error)
      // Don't throw - deactivation should be non-blocking
    }
  }

  /**
   * Request fullscreen with browser compatibility checks
   */
  private async requestFullscreenWithCompatibility(): Promise<void> {
    try {
      // Check if already in fullscreen
      if (document.fullscreenElement || 
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement) {
        this.log('Already in fullscreen mode')
        return
      }

      const container = this.config.container
      let requestFullscreen: (() => Promise<void>) | null = null

      // Check for different fullscreen API implementations
      if (container.requestFullscreen) {
        requestFullscreen = () => container.requestFullscreen()
      } else if ((container as any).webkitRequestFullscreen) {
        requestFullscreen = () => (container as any).webkitRequestFullscreen()
      } else if ((container as any).mozRequestFullScreen) {
        requestFullscreen = () => (container as any).mozRequestFullScreen()
      } else if ((container as any).msRequestFullscreen) {
        requestFullscreen = () => (container as any).msRequestFullscreen()
      }

      if (requestFullscreen) {
        this.log('Requesting fullscreen mode')
        await requestFullscreen()
        this.log('Fullscreen activated')
      } else {
        this.log('Fullscreen API not supported in this browser')
      }
    } catch (error) {
      this.log('Fullscreen request error (non-critical):', error)
      // Don't throw - fullscreen is optional for VR functionality
    }
  }

  /**
   * Exit fullscreen with browser compatibility
   */
  private async exitFullscreenWithCompatibility(): Promise<void> {
    try {
      let exitFullscreen: (() => Promise<void>) | null = null

      // Check for different fullscreen exit API implementations
      if (document.exitFullscreen) {
        exitFullscreen = () => document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        exitFullscreen = () => (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        exitFullscreen = () => (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        exitFullscreen = () => (document as any).msExitFullscreen()
      }

      // Check if currently in fullscreen before trying to exit
      const isFullscreen = !!(document.fullscreenElement || 
                             (document as any).webkitFullscreenElement ||
                             (document as any).mozFullScreenElement ||
                             (document as any).msFullscreenElement)

      if (isFullscreen && exitFullscreen) {
        this.log('Exiting fullscreen mode')
        await exitFullscreen()
        this.log('Fullscreen exited')
      } else if (!isFullscreen) {
        this.log('Not currently in fullscreen mode')
      } else {
        this.log('Fullscreen exit API not supported in this browser')
      }
    } catch (error) {
      this.log('Error exiting fullscreen:', error)
      // Don't throw - exit should be non-blocking
    }
  }

  private createTimeout(ms: number, errorMessage: string): Promise<never> {
    return new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        const error = this.createError('timeout', errorMessage, undefined, {
          timeoutDuration: ms,
          operation: errorMessage
        })
        reject(error)
      }, ms)
      
      this.timeouts.add(timeout)
    })
  }

  /**
   * Clear all pending timeouts
   */
  private clearAllTimeouts(): void {
    this.logger.debug('Manager', `Clearing ${this.timeouts.size} pending timeouts`)
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
  }

  /**
   * Reinitialize VR plugins for error recovery
   */
  private async reinitializePlugins(): Promise<void> {
    this.logger.info('Manager', 'Reinitializing VR plugins')
    
    try {
      // This would typically involve re-creating or resetting plugin instances
      // The actual implementation depends on the Photo Sphere Viewer plugin architecture
      
      // For now, we'll just verify the plugins are still available
      const stereoPlugin = this.getStereoPlugin()
      const gyroPlugin = this.getGyroscopePlugin()
      
      this.logger.info('Manager', 'Plugin reinitialization check', {
        stereoPlugin: !!stereoPlugin,
        gyroPlugin: !!gyroPlugin
      })
      
      if (!stereoPlugin) {
        throw new Error('Stereo plugin not available after reinitialization')
      }
      
    } catch (error) {
      this.logger.error('Manager', 'Plugin reinitialization failed', { error })
      throw error
    }
  }

  private createError(category: VRErrorCategory, message: string, originalError?: Error, context?: Record<string, any>): VRError {
    return this.errorHandler.createError(category, message, originalError, context)
  }

  private async handleError(error: VRError, recoveryContext?: any): Promise<void> {
    this.logger.error('Manager', `VR Error [${error.category}]: ${error.message}`, {
      error,
      context: error.context
    })
    
    this.updateState({ 
      status: 'error', 
      error: error.userMessage 
    })

    // Clear any pending timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()

    // Attempt automatic recovery
    const recoverySuccess = await this.errorHandler.handleError(error, {
      vrManager: this,
      retryCallback: recoveryContext?.retryCallback,
      reinitializeCallback: recoveryContext?.reinitializeCallback,
      enableFallback: recoveryContext?.enableFallback,
      showUserDialog: recoveryContext?.showUserDialog
    })

    if (recoverySuccess) {
      this.logger.info('Manager', `Recovery successful for ${error.category} error`)
      this.updateState({ status: 'idle', error: undefined })
    } else {
      this.logger.warn('Manager', `Recovery failed for ${error.category} error`)
    }
  }

  private onErrorOccurred(error: VRError): void {
    this.logger.error('ErrorHandler', 'Error occurred', { error })
  }

  private onRecoveryAttempted(strategy: any, success: boolean): void {
    this.logger.info('ErrorHandler', `Recovery attempt: ${strategy} - ${success ? 'SUCCESS' : 'FAILED'}`)
  }

  private log(message: string, ...args: any[]): void {
    this.logger.info('Manager', message, args.length > 0 ? args : undefined)
  }
}