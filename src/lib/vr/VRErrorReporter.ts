/**
 * VR Error Reporter
 * Centralized error reporting service for VR-related errors
 */

import { VRError, VRErrorCategory, VRErrorSeverity } from './types'

export interface VRErrorReport {
  id: string
  error: VRError
  context: {
    userAgent: string
    url: string
    timestamp: string
    sessionId: string
    userId?: string
  }
  stackTrace?: string
  breadcrumbs: VRErrorBreadcrumb[]
}

export interface VRErrorBreadcrumb {
  timestamp: Date
  category: 'user_action' | 'vr_state' | 'api_call' | 'navigation'
  message: string
  data?: Record<string, any>
}

export interface VRErrorReporterConfig {
  maxBreadcrumbs?: number
  enableConsoleLogging?: boolean
  enableLocalStorage?: boolean
  apiEndpoint?: string
  apiKey?: string
}

/**
 * VR Error Reporter Service
 * 
 * Features:
 * - Centralized error collection and reporting
 * - Breadcrumb tracking for debugging context
 * - Local storage for offline error queuing
 * - Configurable reporting endpoints
 * - Error deduplication and rate limiting
 */
export class VRErrorReporter {
  private config: Required<VRErrorReporterConfig>
  private breadcrumbs: VRErrorBreadcrumb[] = []
  private sessionId: string
  private errorQueue: VRErrorReport[] = []
  private reportedErrors = new Set<string>()

  constructor(config: VRErrorReporterConfig = {}) {
    this.config = {
      maxBreadcrumbs: config.maxBreadcrumbs || 50,
      enableConsoleLogging: config.enableConsoleLogging ?? true,
      enableLocalStorage: config.enableLocalStorage ?? true,
      apiEndpoint: config.apiEndpoint || '',
      apiKey: config.apiKey || ''
    }

    this.sessionId = this.generateSessionId()
    this.loadQueuedErrors()
    this.setupPeriodicReporting()
  }

  /**
   * Reports a VR error
   */
  reportError(vrError: VRError, additionalContext?: Record<string, any>): void {
    // Check for duplicate errors
    const errorKey = this.getErrorKey(vrError)
    if (this.reportedErrors.has(errorKey)) {
      return
    }

    this.reportedErrors.add(errorKey)

    const report: VRErrorReport = {
      id: vrError.id,
      error: vrError,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...additionalContext
      },
      stackTrace: vrError.originalError?.stack,
      breadcrumbs: [...this.breadcrumbs]
    }

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(report)
    }

    // Add to queue for reporting
    this.errorQueue.push(report)

    // Save to local storage if enabled
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(report)
    }

    // Try to send immediately
    this.sendErrorReports()
  }

  /**
   * Adds a breadcrumb for debugging context
   */
  addBreadcrumb(breadcrumb: Omit<VRErrorBreadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: VRErrorBreadcrumb = {
      ...breadcrumb,
      timestamp: new Date()
    }

    this.breadcrumbs.push(fullBreadcrumb)

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs)
    }
  }

  /**
   * Clears all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = []
  }

  /**
   * Gets current breadcrumbs
   */
  getBreadcrumbs(): VRErrorBreadcrumb[] {
    return [...this.breadcrumbs]
  }

  /**
   * Gets error statistics for the current session
   */
  getErrorStats(): {
    totalErrors: number
    errorsByCategory: Record<VRErrorCategory, number>
    errorsBySeverity: Record<VRErrorSeverity, number>
    queuedErrors: number
  } {
    const stats = {
      totalErrors: this.reportedErrors.size,
      errorsByCategory: {
        permission: 0,
        plugin: 0,
        timeout: 0,
        compatibility: 0
      } as Record<VRErrorCategory, number>,
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0
      } as Record<VRErrorSeverity, number>,
      queuedErrors: this.errorQueue.length
    }

    this.errorQueue.forEach(report => {
      stats.errorsByCategory[report.error.category]++
      stats.errorsBySeverity[report.error.severity]++
    })

    return stats
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `vr-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Creates a unique key for error deduplication
   */
  private getErrorKey(vrError: VRError): string {
    return `${vrError.category}-${vrError.message.substring(0, 100)}`
  }

  /**
   * Logs error report to console
   */
  private logToConsole(report: VRErrorReport): void {
    const style = this.getConsoleStyle(report.error.severity)
    
    console.group(`%c🚨 VR Error Report [${report.error.severity.toUpperCase()}]`, style)
    console.log('Error ID:', report.id)
    console.log('Category:', report.error.category)
    console.log('Message:', report.error.message)
    console.log('User Message:', report.error.userMessage)
    console.log('Recovery Strategy:', report.error.recoveryStrategy)
    console.log('Context:', report.context)
    
    if (report.error.originalError) {
      console.log('Original Error:', report.error.originalError)
    }
    
    if (report.breadcrumbs.length > 0) {
      console.log('Breadcrumbs:', report.breadcrumbs)
    }
    
    console.groupEnd()
  }

  /**
   * Gets console styling based on error severity
   */
  private getConsoleStyle(severity: VRErrorSeverity): string {
    switch (severity) {
      case 'high':
        return 'color: #ff4444; font-weight: bold; font-size: 14px;'
      case 'medium':
        return 'color: #ffaa00; font-weight: bold; font-size: 12px;'
      case 'low':
        return 'color: #4488ff; font-weight: normal; font-size: 11px;'
      default:
        return 'color: #666666; font-weight: normal; font-size: 11px;'
    }
  }

  /**
   * Saves error report to local storage
   */
  private saveToLocalStorage(report: VRErrorReport): void {
    try {
      const key = `vr-error-${report.id}`
      localStorage.setItem(key, JSON.stringify(report))
    } catch (error) {
      console.warn('Failed to save VR error to localStorage:', error)
    }
  }

  /**
   * Loads queued errors from local storage
   */
  private loadQueuedErrors(): void {
    if (!this.config.enableLocalStorage) return

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('vr-error-')) {
          const reportData = localStorage.getItem(key)
          if (reportData) {
            const report = JSON.parse(reportData) as VRErrorReport
            this.errorQueue.push(report)
          }
        }
      })
    } catch (error) {
      console.warn('Failed to load queued VR errors from localStorage:', error)
    }
  }

  /**
   * Sends error reports to the configured endpoint
   */
  private async sendErrorReports(): Promise<void> {
    if (!this.config.apiEndpoint || this.errorQueue.length === 0) {
      return
    }

    const reportsToSend = [...this.errorQueue]
    this.errorQueue = []

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          reports: reportsToSend,
          sessionId: this.sessionId
        })
      })

      if (response.ok) {
        // Remove successfully sent errors from localStorage
        reportsToSend.forEach(report => {
          localStorage.removeItem(`vr-error-${report.id}`)
        })
      } else {
        // Put reports back in queue for retry
        this.errorQueue.unshift(...reportsToSend)
      }
    } catch (error) {
      console.warn('Failed to send VR error reports:', error)
      // Put reports back in queue for retry
      this.errorQueue.unshift(...reportsToSend)
    }
  }

  /**
   * Sets up periodic error reporting
   */
  private setupPeriodicReporting(): void {
    // Send queued errors every 30 seconds
    setInterval(() => {
      this.sendErrorReports()
    }, 30000)

    // Send errors before page unload
    window.addEventListener('beforeunload', () => {
      this.sendErrorReports()
    })
  }
}

// Global instance
export const vrErrorReporter = new VRErrorReporter({
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  // TODO: Configure with actual error reporting endpoint
  // apiEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  // apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY
})

export default vrErrorReporter