/**
 * VRLogger - Detailed logging system for debugging VR issues
 * Provides structured logging with different levels and context tracking
 */

export type VRLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface VRLogEntry {
  timestamp: Date
  level: VRLogLevel
  category: string
  message: string
  data?: any
  context?: Record<string, any>
}

export interface VRLoggerConfig {
  enableConsoleOutput?: boolean
  enableStorage?: boolean
  maxStoredEntries?: number
  logLevel?: VRLogLevel
  includeStackTrace?: boolean
}

export class VRLogger {
  private config: VRLoggerConfig
  private logEntries: VRLogEntry[] = []
  private context: Record<string, any> = {}

  private readonly LOG_LEVELS: Record<VRLogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  constructor(config: VRLoggerConfig = {}) {
    this.config = {
      enableConsoleOutput: true,
      enableStorage: true,
      maxStoredEntries: 1000,
      logLevel: 'info',
      includeStackTrace: false,
      ...config
    }
  }

  /**
   * Set global context that will be included in all log entries
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {}
  }

  /**
   * Log debug message
   */
  debug(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log('debug', category, message, data, context)
  }

  /**
   * Log info message
   */
  info(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log('info', category, message, data, context)
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log('warn', category, message, data, context)
  }

  /**
   * Log error message
   */
  error(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log('error', category, message, data, context)
  }

  /**
   * Core logging method
   */
  private log(level: VRLogLevel, category: string, message: string, data?: any, context?: Record<string, any>): void {
    // Check if this log level should be processed
    if (this.LOG_LEVELS[level] < this.LOG_LEVELS[this.config.logLevel || 'info']) {
      return
    }

    const logEntry: VRLogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      context: { ...this.context, ...context }
    }

    // Store log entry if storage is enabled
    if (this.config.enableStorage) {
      this.storeLogEntry(logEntry)
    }

    // Output to console if enabled
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry)
    }
  }

  /**
   * Store log entry with rotation
   */
  private storeLogEntry(entry: VRLogEntry): void {
    this.logEntries.push(entry)

    // Rotate logs if we exceed max entries
    const maxEntries = this.config.maxStoredEntries || 1000
    if (this.logEntries.length > maxEntries) {
      this.logEntries = this.logEntries.slice(-maxEntries)
    }
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: VRLogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[VR:${entry.category}] ${timestamp}`
    const message = `${prefix} ${entry.message}`

    const logData = {
      ...entry.data,
      context: entry.context
    }

    switch (entry.level) {
      case 'debug':
        console.debug(message, logData)
        break
      case 'info':
        console.log(message, logData)
        break
      case 'warn':
        console.warn(message, logData)
        if (this.config.includeStackTrace) {
          console.trace('Stack trace:')
        }
        break
      case 'error':
        console.error(message, logData)
        if (this.config.includeStackTrace) {
          console.trace('Stack trace:')
        }
        break
    }
  }

  /**
   * Get all stored log entries
   */
  getLogs(): VRLogEntry[] {
    return [...this.logEntries]
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: VRLogLevel): VRLogEntry[] {
    return this.logEntries.filter(entry => entry.level === level)
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category: string): VRLogEntry[] {
    return this.logEntries.filter(entry => entry.category === category)
  }

  /**
   * Get logs from a specific time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): VRLogEntry[] {
    return this.logEntries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    )
  }

  /**
   * Get recent logs (last N minutes)
   */
  getRecentLogs(minutes: number = 5): VRLogEntry[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)
    return this.logEntries.filter(entry => entry.timestamp >= cutoffTime)
  }

  /**
   * Search logs by message content
   */
  searchLogs(searchTerm: string): VRLogEntry[] {
    const lowerSearchTerm = searchTerm.toLowerCase()
    return this.logEntries.filter(entry => 
      entry.message.toLowerCase().includes(lowerSearchTerm) ||
      entry.category.toLowerCase().includes(lowerSearchTerm)
    )
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalEntries: number
    entriesByLevel: Record<VRLogLevel, number>
    entriesByCategory: Record<string, number>
    recentEntries: number
    oldestEntry?: Date
    newestEntry?: Date
  } {
    const entriesByLevel: Record<VRLogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    }

    const entriesByCategory: Record<string, number> = {}

    this.logEntries.forEach(entry => {
      entriesByLevel[entry.level]++
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1
    })

    const recentEntries = this.getRecentLogs(5).length
    const timestamps = this.logEntries.map(entry => entry.timestamp)
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined

    return {
      totalEntries: this.logEntries.length,
      entriesByLevel,
      entriesByCategory,
      recentEntries,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2)
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logEntries = []
    this.info('Logger', 'Log history cleared')
  }

  /**
   * Create a child logger with additional context
   */
  createChildLogger(additionalContext: Record<string, any>): VRLogger {
    const childLogger = new VRLogger(this.config)
    childLogger.setContext({ ...this.context, ...additionalContext })
    return childLogger
  }

  /**
   * Log VR session start
   */
  logSessionStart(sessionId: string, userAgent: string, deviceInfo?: Record<string, any>): void {
    this.info('Session', 'VR session started', {
      sessionId,
      userAgent,
      deviceInfo,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log VR session end
   */
  logSessionEnd(sessionId: string, duration: number, errors: number): void {
    this.info('Session', 'VR session ended', {
      sessionId,
      duration,
      errors,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log performance metrics
   */
  logPerformance(category: string, operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info('Performance', `${operation} completed`, {
      category,
      operation,
      duration,
      metadata
    })
  }

  /**
   * Log user interaction
   */
  logUserInteraction(action: string, element: string, metadata?: Record<string, any>): void {
    this.info('UserInteraction', `User ${action}`, {
      action,
      element,
      metadata
    })
  }

  /**
   * Log browser/device compatibility info
   */
  logCompatibilityInfo(feature: string, supported: boolean, details?: Record<string, any>): void {
    this.info('Compatibility', `${feature} support: ${supported ? 'YES' : 'NO'}`, {
      feature,
      supported,
      details
    })
  }
}