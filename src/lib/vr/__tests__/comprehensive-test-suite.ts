/**
 * Comprehensive VR Test Suite Runner
 * Validates all VR functionality including state transitions, error handling, and cross-browser compatibility
 */

import { VRManager } from '../VRManager'
import { VRErrorHandler } from '../VRErrorHandler'
import { VRLogger } from '../VRLogger'
import {
  createMockViewer,
  createMockStereoPlugin,
  createMockGyroscopePlugin,
  mockDeviceOrientationPermission,
  mockUserAgent,
  mockFullscreenAPI,
  mockSecureContext,
  USER_AGENTS,
} from './mocks/PhotoSphereViewerMocks'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
}

class ComprehensiveTestRunner {
  private results: TestSuite[] = []
  private cleanupFunctions: Array<() => void> = []

  async runAllTests(): Promise<{ suites: TestSuite[], totalPassed: number, totalFailed: number }> {
    console.log('🧪 Running Comprehensive VR Test Suite...\n')

    const suites = [
      await this.runVRManagerTests(),
      await this.runErrorHandlerTests(),
      await this.runLoggerTests(),
      await this.runIntegrationTests(),
      await this.runCrossBrowserTests(),
      await this.runPerformanceTests(),
    ]

    const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0)
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0)

    this.printResults(suites, totalPassed, totalFailed)

    return { suites, totalPassed, totalFailed }
  }

  private async runVRManagerTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'VRManager Core Functionality',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test VR activation
    suite.tests.push(await this.runTest('VR Activation', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.activateVR()
      
      if (vrManager.getState().status !== 'active') {
        throw new Error('VR activation failed')
      }

      vrManager.cleanup()
    }))

    // Test VR deactivation
    suite.tests.push(await this.runTest('VR Deactivation', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.activateVR()
      await vrManager.deactivateVR()
      
      if (vrManager.getState().status !== 'idle') {
        throw new Error('VR deactivation failed')
      }

      vrManager.cleanup()
    }))

    // Test state transitions
    suite.tests.push(await this.runTest('State Transitions', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      const states: string[] = []
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state) => states.push(state.status),
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.toggleVR()
      await vrManager.toggleVR()

      const expectedStates = ['idle', 'requesting', 'active', 'idle']
      if (!this.arraysEqual(states, expectedStates)) {
        throw new Error(`Expected states ${expectedStates}, got ${states}`)
      }

      vrManager.cleanup()
    }))

    // Test error handling
    suite.tests.push(await this.runTest('Error Handling', async () => {
      const failingStereoPlugin = createMockStereoPlugin({ shouldFailToggle: true })
      const mockViewer = createMockViewer({ stereoPlugin: failingStereoPlugin })
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      try {
        await vrManager.activateVR()
        throw new Error('Expected VR activation to fail')
      } catch (error) {
        if (vrManager.getState().status !== 'error') {
          throw new Error('Expected error state after failed activation')
        }
      }

      vrManager.cleanup()
    }))

    // Test permission handling
    suite.tests.push(await this.runTest('Permission Handling', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      this.cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      this.cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      const permissionGranted = await vrManager.requestPermissions()
      
      if (!permissionGranted || vrManager.getPermissionStatus() !== 'granted') {
        throw new Error('Permission request failed')
      }

      vrManager.cleanup()
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runErrorHandlerTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Error Handler',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test error creation
    suite.tests.push(await this.runTest('Error Creation', async () => {
      const errorHandler = new VRErrorHandler({ enableDetailedLogging: false })
      const error = errorHandler.createError('permission', 'Test error')

      if (!error.id || !error.timestamp || error.category !== 'permission') {
        throw new Error('Error creation failed')
      }
    }))

    // Test error statistics
    suite.tests.push(await this.runTest('Error Statistics', async () => {
      const errorHandler = new VRErrorHandler({ enableDetailedLogging: false })
      
      errorHandler.createError('permission', 'Error 1')
      errorHandler.createError('plugin', 'Error 2')
      
      const stats = errorHandler.getErrorStats()
      
      if (stats.totalErrors !== 2 || stats.errorsByCategory.permission !== 1) {
        throw new Error('Error statistics incorrect')
      }
    }))

    // Test error recovery
    suite.tests.push(await this.runTest('Error Recovery', async () => {
      const errorHandler = new VRErrorHandler({ enableDetailedLogging: false })
      const mockRetryCallback = jest.fn().mockResolvedValue(true)
      
      const error = errorHandler.createError('timeout', 'Timeout error')
      const success = await errorHandler.handleError(error, {
        retryCallback: mockRetryCallback
      })

      if (!success || !mockRetryCallback.mock.calls.length) {
        throw new Error('Error recovery failed')
      }
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runLoggerTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Logger',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test basic logging
    suite.tests.push(await this.runTest('Basic Logging', async () => {
      const logger = new VRLogger({ enableConsoleOutput: false })
      
      logger.info('Test', 'Test message')
      logger.warn('Test', 'Warning message')
      logger.error('Test', 'Error message')

      const logs = logger.getLogs()
      
      if (logs.length !== 3) {
        throw new Error(`Expected 3 logs, got ${logs.length}`)
      }
    }))

    // Test log filtering
    suite.tests.push(await this.runTest('Log Filtering', async () => {
      const logger = new VRLogger({ 
        enableConsoleOutput: false,
        logLevel: 'warn'
      })
      
      logger.debug('Test', 'Debug message')
      logger.info('Test', 'Info message')
      logger.warn('Test', 'Warning message')
      logger.error('Test', 'Error message')

      const logs = logger.getLogs()
      
      if (logs.length !== 2) {
        throw new Error(`Expected 2 logs (warn/error), got ${logs.length}`)
      }
    }))

    // Test log statistics
    suite.tests.push(await this.runTest('Log Statistics', async () => {
      const logger = new VRLogger({ enableConsoleOutput: false })
      
      logger.info('Category1', 'Message 1')
      logger.warn('Category1', 'Message 2')
      logger.error('Category2', 'Message 3')

      const stats = logger.getLogStats()
      
      if (stats.totalEntries !== 3 || stats.entriesByCategory.Category1 !== 2) {
        throw new Error('Log statistics incorrect')
      }
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runIntegrationTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Integration Tests',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test complete VR flow
    suite.tests.push(await this.runTest('Complete VR Flow', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      const stateChanges: string[] = []
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state) => stateChanges.push(state.status),
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      // Complete activation/deactivation cycle
      await vrManager.activateVR()
      await vrManager.deactivateVR()

      const expectedFlow = ['idle', 'requesting', 'active', 'idle']
      if (!this.arraysEqual(stateChanges, expectedFlow)) {
        throw new Error(`Expected flow ${expectedFlow}, got ${stateChanges}`)
      }

      // Verify plugins were called
      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      const gyroPlugin = mockViewer.getPlugin('GyroscopePlugin')
      
      if (!stereoPlugin.toggle.mock.calls.length || !gyroPlugin.start.mock.calls.length) {
        throw new Error('Plugins were not activated')
      }

      vrManager.cleanup()
    }))

    // Test error recovery integration
    suite.tests.push(await this.runTest('Error Recovery Integration', async () => {
      const mockStereoPlugin = createMockStereoPlugin({ shouldFailToggle: true })
      const mockViewer = createMockViewer({ stereoPlugin: mockStereoPlugin })
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      // First attempt should fail
      try {
        await vrManager.activateVR()
        throw new Error('Expected activation to fail')
      } catch (error) {
        if (vrManager.getState().status !== 'error') {
          throw new Error('Expected error state')
        }
      }

      // Fix the plugin and retry
      mockStereoPlugin.toggle.mockImplementation(() => {})
      
      await vrManager.toggleVR()
      
      if (vrManager.getState().status !== 'active') {
        throw new Error('Recovery failed')
      }

      vrManager.cleanup()
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runCrossBrowserTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Cross-Browser Compatibility',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test iOS Safari
    suite.tests.push(await this.runTest('iOS Safari', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      this.cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      this.cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.activateVR()
      
      if (vrManager.getState().status !== 'active' || !vrManager.detectIOSDevice()) {
        throw new Error('iOS Safari compatibility failed')
      }

      vrManager.cleanup()
    }))

    // Test Android Chrome
    suite.tests.push(await this.runTest('Android Chrome', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.ANDROID_CHROME)
      this.cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.activateVR()
      
      if (vrManager.getState().status !== 'active' || vrManager.detectIOSDevice()) {
        throw new Error('Android Chrome compatibility failed')
      }

      vrManager.cleanup()
    }))

    // Test Desktop browsers
    suite.tests.push(await this.runTest('Desktop Browsers', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      this.cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      await vrManager.activateVR()
      
      if (vrManager.getState().status !== 'active') {
        throw new Error('Desktop browser compatibility failed')
      }

      vrManager.cleanup()
    }))

    // Test missing APIs
    suite.tests.push(await this.runTest('Missing APIs Graceful Degradation', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      this.cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(false) // No fullscreen API
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      // Should still work without fullscreen
      await vrManager.activateVR()
      
      if (vrManager.getState().status !== 'active') {
        throw new Error('Graceful degradation failed')
      }

      vrManager.cleanup()
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runPerformanceTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Performance Tests',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    }

    const startTime = Date.now()

    // Test rapid state changes
    suite.tests.push(await this.runTest('Rapid State Changes', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      const startTime = Date.now()
      
      // Perform rapid toggles
      for (let i = 0; i < 10; i++) {
        await vrManager.toggleVR()
      }
      
      const duration = Date.now() - startTime
      
      if (duration > 5000) { // Should complete within 5 seconds
        throw new Error(`Rapid state changes too slow: ${duration}ms`)
      }

      vrManager.cleanup()
    }))

    // Test memory cleanup
    suite.tests.push(await this.runTest('Memory Cleanup', async () => {
      const mockViewer = createMockViewer()
      const mockContainer = mockFullscreenAPI(true)
      
      const vrManager = new VRManager({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      })

      // Activate and deactivate multiple times
      for (let i = 0; i < 5; i++) {
        await vrManager.activateVR()
        await vrManager.deactivateVR()
      }

      // Check that timeouts are cleaned up
      const diagnostics = vrManager.exportDiagnostics()
      
      vrManager.cleanup()

      // After cleanup, should not be able to activate
      try {
        await vrManager.activateVR()
        throw new Error('Expected activation to fail after cleanup')
      } catch (error) {
        if (!error.message.includes('destroyed')) {
          throw new Error('Cleanup not working properly')
        }
      }
    }))

    suite.duration = Date.now() - startTime
    suite.passed = suite.tests.filter(t => t.passed).length
    suite.failed = suite.tests.filter(t => !t.passed).length

    return suite
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      await testFn()
      return {
        name,
        passed: true,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      }
    } finally {
      // Run cleanup functions
      this.cleanupFunctions.forEach(cleanup => cleanup())
      this.cleanupFunctions = []
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
  }

  private printResults(suites: TestSuite[], totalPassed: number, totalFailed: number): void {
    console.log('\n📊 Test Results Summary')
    console.log('=' .repeat(50))

    suites.forEach(suite => {
      const status = suite.failed === 0 ? '✅' : '❌'
      console.log(`\n${status} ${suite.name}`)
      console.log(`   Passed: ${suite.passed}, Failed: ${suite.failed}, Duration: ${suite.duration}ms`)
      
      if (suite.failed > 0) {
        suite.tests.filter(t => !t.passed).forEach(test => {
          console.log(`   ❌ ${test.name}: ${test.error}`)
        })
      }
    })

    console.log('\n' + '='.repeat(50))
    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`)
    
    if (totalFailed === 0) {
      console.log('🎉 All tests passed!')
    } else {
      console.log('💥 Some tests failed!')
    }
  }
}

// Export for use in other test files
export { ComprehensiveTestRunner }

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner()
  runner.runAllTests().then(({ totalFailed }) => {
    process.exit(totalFailed > 0 ? 1 : 0)
  }).catch(error => {
    console.error('Test runner error:', error)
    process.exit(1)
  })
}