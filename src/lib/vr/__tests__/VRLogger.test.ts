/**
 * VRLogger Tests
 * Tests for detailed logging system and debugging functionality
 */

import { VRLogger, VRLogLevel } from '../VRLogger'

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
}

// Replace console methods
Object.assign(console, mockConsole)

describe('VRLogger', () => {
  let logger: VRLogger

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear())
    
    logger = new VRLogger({
      enableConsoleOutput: true,
      enableStorage: true,
      maxStoredEntries: 100,
      logLevel: 'debug',
      includeStackTrace: false
    })
  })

  describe('Basic Logging', () => {
    test('should log debug messages', () => {
      logger.debug('TestCategory', 'Debug message', { data: 'test' })

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[VR:TestCategory]'),
        expect.objectContaining({ data: 'test' })
      )

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        level: 'debug',
        category: 'TestCategory',
        message: 'Debug message'
      })
    })

    test('should log info messages', () => {
      logger.info('TestCategory', 'Info message', { data: 'test' })

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[VR:TestCategory]'),
        expect.objectContaining({ data: 'test' })
      )

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
    })

    test('should log warning messages', () => {
      logger.warn('TestCategory', 'Warning message', { data: 'test' })

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[VR:TestCategory]'),
        expect.objectContaining({ data: 'test' })
      )

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
    })

    test('should log error messages', () => {
      logger.error('TestCategory', 'Error message', { data: 'test' })

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[VR:TestCategory]'),
        expect.objectContaining({ data: 'test' })
      )

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
    })
  })

  describe('Log Level Filtering', () => {
    beforeEach(() => {
      logger = new VRLogger({
        enableConsoleOutput: true,
        enableStorage: true,
        logLevel: 'warn' // Only warn and error should be processed
      })
    })

    test('should respect log level filtering', () => {
      logger.debug('Test', 'Debug message')
      logger.info('Test', 'Info message')
      logger.warn('Test', 'Warning message')
      logger.error('Test', 'Error message')

      // Only warn and error should be logged
      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalled()

      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].level).toBe('warn')
      expect(logs[1].level).toBe('error')
    })
  })

  describe('Context Management', () => {
    test('should include global context in logs', () => {
      logger.setContext({ sessionId: 'test-session', userId: 'test-user' })
      logger.info('Test', 'Test message')

      const logs = logger.getLogs()
      expect(logs[0].context).toMatchObject({
        sessionId: 'test-session',
        userId: 'test-user'
      })
    })

    test('should merge local context with global context', () => {
      logger.setContext({ sessionId: 'test-session' })
      logger.info('Test', 'Test message', null, { requestId: 'test-request' })

      const logs = logger.getLogs()
      expect(logs[0].context).toMatchObject({
        sessionId: 'test-session',
        requestId: 'test-request'
      })
    })

    test('should allow clearing context', () => {
      logger.setContext({ sessionId: 'test-session' })
      logger.clearContext()
      logger.info('Test', 'Test message')

      const logs = logger.getLogs()
      expect(logs[0].context).toEqual({})
    })
  })

  describe('Log Storage and Retrieval', () => {
    test('should store logs when storage is enabled', () => {
      logger.info('Test', 'Message 1')
      logger.warn('Test', 'Message 2')
      logger.error('Test', 'Message 3')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(3)
    })

    test('should not store logs when storage is disabled', () => {
      const noStorageLogger = new VRLogger({
        enableStorage: false,
        enableConsoleOutput: false
      })

      noStorageLogger.info('Test', 'Message 1')
      noStorageLogger.warn('Test', 'Message 2')

      const logs = noStorageLogger.getLogs()
      expect(logs).toHaveLength(0)
    })

    test('should rotate logs when max entries exceeded', () => {
      const smallLogger = new VRLogger({
        maxStoredEntries: 3,
        enableConsoleOutput: false
      })

      // Add 5 logs
      for (let i = 1; i <= 5; i++) {
        smallLogger.info('Test', `Message ${i}`)
      }

      const logs = smallLogger.getLogs()
      expect(logs).toHaveLength(3)
      expect(logs[0].message).toBe('Message 3') // First two should be rotated out
      expect(logs[2].message).toBe('Message 5')
    })
  })

  describe('Log Filtering and Search', () => {
    beforeEach(() => {
      logger.debug('Category1', 'Debug message')
      logger.info('Category1', 'Info message')
      logger.warn('Category2', 'Warning message')
      logger.error('Category2', 'Error message')
    })

    test('should filter logs by level', () => {
      const debugLogs = logger.getLogsByLevel('debug')
      const errorLogs = logger.getLogsByLevel('error')

      expect(debugLogs).toHaveLength(1)
      expect(debugLogs[0].message).toBe('Debug message')
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Error message')
    })

    test('should filter logs by category', () => {
      const category1Logs = logger.getLogsByCategory('Category1')
      const category2Logs = logger.getLogsByCategory('Category2')

      expect(category1Logs).toHaveLength(2)
      expect(category2Logs).toHaveLength(2)
    })

    test('should filter logs by time range', () => {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000)

      const logsInRange = logger.getLogsByTimeRange(oneMinuteAgo, oneMinuteFromNow)
      expect(logsInRange).toHaveLength(4) // All logs should be in range

      const logsOutOfRange = logger.getLogsByTimeRange(oneMinuteAgo, oneMinuteAgo)
      expect(logsOutOfRange).toHaveLength(0)
    })

    test('should get recent logs', () => {
      const recentLogs = logger.getRecentLogs(5) // Last 5 minutes
      expect(recentLogs).toHaveLength(4) // All logs should be recent
    })

    test('should search logs by content', () => {
      const debugSearchResults = logger.searchLogs('debug')
      const category2SearchResults = logger.searchLogs('category2')

      expect(debugSearchResults).toHaveLength(1)
      expect(debugSearchResults[0].message).toBe('Debug message')
      expect(category2SearchResults).toHaveLength(2) // Case insensitive search
    })
  })

  describe('Log Statistics', () => {
    beforeEach(() => {
      logger.debug('Category1', 'Debug message')
      logger.info('Category1', 'Info message')
      logger.warn('Category2', 'Warning message')
      logger.error('Category2', 'Error message')
      logger.error('Category3', 'Another error')
    })

    test('should provide accurate log statistics', () => {
      const stats = logger.getLogStats()

      expect(stats.totalEntries).toBe(5)
      expect(stats.entriesByLevel.debug).toBe(1)
      expect(stats.entriesByLevel.info).toBe(1)
      expect(stats.entriesByLevel.warn).toBe(1)
      expect(stats.entriesByLevel.error).toBe(2)
      expect(stats.entriesByCategory.Category1).toBe(2)
      expect(stats.entriesByCategory.Category2).toBe(2)
      expect(stats.entriesByCategory.Category3).toBe(1)
      expect(stats.recentEntries).toBe(5) // All should be recent
      expect(stats.oldestEntry).toBeInstanceOf(Date)
      expect(stats.newestEntry).toBeInstanceOf(Date)
    })
  })

  describe('Specialized Logging Methods', () => {
    test('should log session start', () => {
      logger.logSessionStart('session-123', 'Mozilla/5.0...', { device: 'iPhone' })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe('Session')
      expect(logs[0].message).toBe('VR session started')
      expect(logs[0].data).toMatchObject({
        sessionId: 'session-123',
        userAgent: 'Mozilla/5.0...',
        deviceInfo: { device: 'iPhone' }
      })
    })

    test('should log session end', () => {
      logger.logSessionEnd('session-123', 5000, 2)

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe('Session')
      expect(logs[0].message).toBe('VR session ended')
      expect(logs[0].data).toMatchObject({
        sessionId: 'session-123',
        duration: 5000,
        errors: 2
      })
    })

    test('should log performance metrics', () => {
      logger.logPerformance('VR', 'activation', 1500, { success: true })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe('Performance')
      expect(logs[0].message).toBe('activation completed')
      expect(logs[0].data).toMatchObject({
        category: 'VR',
        operation: 'activation',
        duration: 1500,
        metadata: { success: true }
      })
    })

    test('should log user interactions', () => {
      logger.logUserInteraction('click', 'vr-button', { position: { x: 100, y: 200 } })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe('UserInteraction')
      expect(logs[0].message).toBe('User click')
      expect(logs[0].data).toMatchObject({
        action: 'click',
        element: 'vr-button',
        metadata: { position: { x: 100, y: 200 } }
      })
    })

    test('should log compatibility information', () => {
      logger.logCompatibilityInfo('WebXR', true, { version: '1.0' })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe('Compatibility')
      expect(logs[0].message).toBe('WebXR support: YES')
      expect(logs[0].data).toMatchObject({
        feature: 'WebXR',
        supported: true,
        details: { version: '1.0' }
      })
    })
  })

  describe('Child Logger', () => {
    test('should create child logger with additional context', () => {
      logger.setContext({ sessionId: 'parent-session' })
      const childLogger = logger.createChildLogger({ componentId: 'vr-button' })

      childLogger.info('Test', 'Child message')

      const logs = childLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].context).toMatchObject({
        sessionId: 'parent-session',
        componentId: 'vr-button'
      })
    })
  })

  describe('Log Export and Management', () => {
    test('should export logs as JSON', () => {
      logger.info('Test', 'Message 1')
      logger.warn('Test', 'Message 2')

      const exportedLogs = logger.exportLogs()
      const parsedLogs = JSON.parse(exportedLogs)

      expect(parsedLogs).toHaveLength(2)
      expect(parsedLogs[0].message).toBe('Message 1')
      expect(parsedLogs[1].message).toBe('Message 2')
    })

    test('should clear logs', () => {
      logger.info('Test', 'Message 1')
      logger.warn('Test', 'Message 2')

      expect(logger.getLogs()).toHaveLength(2)

      logger.clearLogs()

      // Should have 1 log (the "Log history cleared" message)
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('Log history cleared')
    })
  })
})