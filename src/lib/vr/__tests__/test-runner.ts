/**
 * Simple test runner for VR error handling system
 * This is a basic test runner to verify the error handling functionality
 */

import { VRErrorHandler } from '../VRErrorHandler'
import { VRLogger } from '../VRLogger'
import { VRManager } from '../VRManager'

// Simple test framework
class SimpleTest {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = []
  private passed = 0
  private failed = 0

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('🧪 Running VR Error Handling Tests...\n')

    for (const test of this.tests) {
      try {
        await test.fn()
        console.log(`✅ ${test.name}`)
        this.passed++
      } catch (error) {
        console.log(`❌ ${test.name}`)
        console.log(`   Error: ${error}`)
        this.failed++
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`)
    return this.failed === 0
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`)
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
        }
      },
      toContain: (expected: any) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`)
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`)
        }
      },
      toBeInstanceOf: (expected: any) => {
        if (!(actual instanceof expected)) {
          throw new Error(`Expected ${actual} to be instance of ${expected.name}`)
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      }
    }
  }
}

// Test suite
const test = new SimpleTest()

// VRErrorHandler Tests
test.test('VRErrorHandler should create errors with correct structure', () => {
  const errorHandler = new VRErrorHandler()
  const error = errorHandler.createError('permission', 'Test error', new Error('Original'))

  test.expect(error.category).toBe('permission')
  test.expect(error.type).toBe('permission') // Backward compatibility
  test.expect(error.message).toBe('Test error')
  test.expect(error.severity).toBe('medium')
  test.expect(error.recoveryStrategy).toBe('reset_permissions')
  test.expect(error.id).toBeDefined()
  test.expect(error.timestamp).toBeInstanceOf(Date)
  test.expect(error.userMessage).toContain('device permissions')
})

test.test('VRErrorHandler should determine correct severity levels', () => {
  const errorHandler = new VRErrorHandler()
  
  const permissionError = errorHandler.createError('permission', 'Permission error')
  const pluginError = errorHandler.createError('plugin', 'Plugin error')
  const timeoutError = errorHandler.createError('timeout', 'Timeout error')
  const compatibilityError = errorHandler.createError('compatibility', 'Compatibility error')

  test.expect(permissionError.severity).toBe('medium')
  test.expect(pluginError.severity).toBe('high')
  test.expect(timeoutError.severity).toBe('medium')
  test.expect(compatibilityError.severity).toBe('low')
})

test.test('VRErrorHandler should track error statistics', () => {
  const errorHandler = new VRErrorHandler({ enableDetailedLogging: false })
  
  errorHandler.createError('permission', 'Error 1')
  errorHandler.createError('permission', 'Error 2')
  errorHandler.createError('plugin', 'Error 3')

  const stats = errorHandler.getErrorStats()
  test.expect(stats.totalErrors).toBe(3)
  test.expect(stats.errorsByCategory.permission).toBe(2)
  test.expect(stats.errorsByCategory.plugin).toBe(1)
})

// VRLogger Tests
test.test('VRLogger should log messages with correct structure', () => {
  const logger = new VRLogger({ enableConsoleOutput: false })
  
  logger.info('TestCategory', 'Test message', { data: 'test' })

  const logs = logger.getLogs()
  test.expect(logs.length).toBe(1)
  test.expect(logs[0].level).toBe('info')
  test.expect(logs[0].category).toBe('TestCategory')
  test.expect(logs[0].message).toBe('Test message')
})

test.test('VRLogger should filter logs by level', () => {
  const logger = new VRLogger({ 
    enableConsoleOutput: false,
    logLevel: 'warn' // Only warn and error should be stored
  })
  
  logger.debug('Test', 'Debug message')
  logger.info('Test', 'Info message')
  logger.warn('Test', 'Warning message')
  logger.error('Test', 'Error message')

  const logs = logger.getLogs()
  test.expect(logs.length).toBe(2) // Only warn and error
  test.expect(logs[0].level).toBe('warn')
  test.expect(logs[1].level).toBe('error')
})

test.test('VRLogger should include context in logs', () => {
  const logger = new VRLogger({ enableConsoleOutput: false })
  
  logger.setContext({ sessionId: 'test-session' })
  logger.info('Test', 'Test message', null, { requestId: 'test-request' })

  const logs = logger.getLogs()
  test.expect(logs[0].context.sessionId).toBe('test-session')
  test.expect(logs[0].context.requestId).toBe('test-request')
})

test.test('VRLogger should provide log statistics', () => {
  const logger = new VRLogger({ enableConsoleOutput: false })
  
  logger.info('Category1', 'Message 1')
  logger.warn('Category1', 'Message 2')
  logger.error('Category2', 'Message 3')

  const stats = logger.getLogStats()
  test.expect(stats.totalEntries).toBe(3)
  test.expect(stats.entriesByLevel.info).toBe(1)
  test.expect(stats.entriesByLevel.warn).toBe(1)
  test.expect(stats.entriesByLevel.error).toBe(1)
  test.expect(stats.entriesByCategory.Category1).toBe(2)
  test.expect(stats.entriesByCategory.Category2).toBe(1)
})

// VRManager Integration Tests
test.test('VRManager should initialize with error handler and logger', () => {
  // Mock the required dependencies
  const mockViewer = { getPlugin: () => null }
  const mockContainer = {} as HTMLElement
  const mockOnStateChange = () => {}

  const vrManager = new VRManager({
    viewer: mockViewer,
    container: mockContainer,
    onStateChange: mockOnStateChange
  })

  const errorHandler = vrManager.getErrorHandler()
  const logger = vrManager.getLogger()

  test.expect(errorHandler).toBeDefined()
  test.expect(logger).toBeDefined()
  test.expect(typeof errorHandler.createError).toBe('function')
  test.expect(typeof logger.info).toBe('function')

  vrManager.cleanup()
})

test.test('VRManager should provide diagnostic information', () => {
  const mockViewer = { getPlugin: () => null }
  const mockContainer = {} as HTMLElement
  const mockOnStateChange = () => {}

  const vrManager = new VRManager({
    viewer: mockViewer,
    container: mockContainer,
    onStateChange: mockOnStateChange
  })

  const diagnostics = vrManager.exportDiagnostics()

  test.expect(diagnostics.sessionId).toBeDefined()
  test.expect(diagnostics.state).toBeDefined()
  test.expect(diagnostics.errorStats).toBeDefined()
  test.expect(diagnostics.recentLogs).toBeDefined()
  test.expect(diagnostics.recentErrors).toBeDefined()

  vrManager.cleanup()
})

// Run the tests
test.run().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n💥 Some tests failed!')
    process.exit(1)
  }
}).catch(error => {
  console.error('Test runner error:', error)
  process.exit(1)
})