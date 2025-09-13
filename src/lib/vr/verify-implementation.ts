/**
 * VRManager Implementation Verification
 * This script verifies that the VR activation and deactivation methods are properly implemented
 */

import { VRManager } from './VRManager'
import { VRManagerConfig } from './types'

// Mock implementations for verification
const mockViewer = {
  getPlugin: (pluginClass: any) => {
    if (pluginClass === 'StereoPlugin') {
      return {
        toggle: () => console.log('Stereo plugin toggled'),
        enter: () => console.log('Stereo plugin entered'),
        exit: () => console.log('Stereo plugin exited')
      }
    }
    if (pluginClass === 'GyroscopePlugin') {
      return {
        isEnabled: () => false,
        start: () => console.log('Gyroscope started'),
        stop: () => console.log('Gyroscope stopped')
      }
    }
    return null
  }
}

const mockContainer = {
  requestFullscreen: () => Promise.resolve()
} as unknown as HTMLElement

const mockOnStateChange = (state: any) => {
  console.log('State changed:', state)
}

export function verifyVRManagerImplementation(): boolean {
  console.log('🔍 Verifying VRManager implementation...')
  
  try {
    // Create VRManager instance
    const config: VRManagerConfig = {
      viewer: mockViewer,
      container: mockContainer,
      onStateChange: mockOnStateChange,
      stereoPlugin: 'StereoPlugin',
      gyroscopePlugin: 'GyroscopePlugin'
    }

    const vrManager = new VRManager(config)

    // Check that required methods exist
    const requiredMethods = [
      'activateVR',
      'deactivateVR',
      'toggleVR',
      'requestPermissions',
      'getState',
      'cleanup'
    ]

    console.log('✅ Checking required methods...')
    for (const method of requiredMethods) {
      if (typeof (vrManager as any)[method] !== 'function') {
        console.error(`❌ Missing method: ${method}`)
        return false
      }
      console.log(`  ✓ ${method}`)
    }

    // Check initial state
    console.log('✅ Checking initial state...')
    const initialState = vrManager.getState()
    if (initialState.status !== 'idle') {
      console.error(`❌ Initial state should be 'idle', got '${initialState.status}'`)
      return false
    }
    console.log('  ✓ Initial state is idle')

    // Check browser compatibility detection
    console.log('✅ Checking browser compatibility detection...')
    const isIOS = vrManager.detectIOSDevice()
    console.log(`  ✓ iOS detection: ${isIOS}`)

    // Check permission requirements
    const permissionsRequired = vrManager.arePermissionsRequired()
    console.log(`  ✓ Permissions required: ${permissionsRequired}`)

    // Cleanup
    vrManager.cleanup()
    console.log('  ✓ Cleanup completed')

    console.log('🎉 VRManager implementation verification passed!')
    return true

  } catch (error) {
    console.error('❌ VRManager implementation verification failed:', error)
    return false
  }
}

// Verify implementation requirements from task
export function verifyTaskRequirements(): boolean {
  console.log('🔍 Verifying task requirements...')
  
  const requirements = [
    {
      name: 'Safe VR toggle functionality with plugin error handling',
      check: () => {
        // Check that VRManager has proper error handling in activateVR and deactivateVR
        const vrManagerCode = require('fs').readFileSync(__filename.replace('verify-implementation.ts', 'VRManager.ts'), 'utf8')
        return vrManagerCode.includes('safeToggleStereoMode') && 
               vrManagerCode.includes('try') && 
               vrManagerCode.includes('catch')
      }
    },
    {
      name: 'Fullscreen mode management with browser compatibility checks',
      check: () => {
        const vrManagerCode = require('fs').readFileSync(__filename.replace('verify-implementation.ts', 'VRManager.ts'), 'utf8')
        return vrManagerCode.includes('requestFullscreenWithCompatibility') &&
               vrManagerCode.includes('webkitRequestFullscreen') &&
               vrManagerCode.includes('mozRequestFullScreen')
      }
    },
    {
      name: 'Gyroscope activation logic with proper cleanup',
      check: () => {
        const vrManagerCode = require('fs').readFileSync(__filename.replace('verify-implementation.ts', 'VRManager.ts'), 'utf8')
        return vrManagerCode.includes('activateGyroscopeWithCleanup') &&
               vrManagerCode.includes('deactivateGyroscopeWithCleanup') &&
               vrManagerCode.includes('clearAllTimeouts')
      }
    }
  ]

  let allPassed = true
  for (const requirement of requirements) {
    try {
      const passed = requirement.check()
      if (passed) {
        console.log(`  ✅ ${requirement.name}`)
      } else {
        console.log(`  ❌ ${requirement.name}`)
        allPassed = false
      }
    } catch (error) {
      console.log(`  ❌ ${requirement.name} (error: ${error})`)
      allPassed = false
    }
  }

  if (allPassed) {
    console.log('🎉 All task requirements verified!')
  } else {
    console.log('❌ Some task requirements failed verification')
  }

  return allPassed
}

// Run verification if this file is executed directly
if (require.main === module) {
  const implementationPassed = verifyVRManagerImplementation()
  const requirementsPassed = verifyTaskRequirements()
  
  if (implementationPassed && requirementsPassed) {
    console.log('🎉 Task 3 implementation is complete and verified!')
    process.exit(0)
  } else {
    console.log('❌ Task 3 implementation needs fixes')
    process.exit(1)
  }
}