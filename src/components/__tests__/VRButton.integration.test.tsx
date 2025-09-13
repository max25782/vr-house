/**
 * VRButton Integration Tests
 * Tests for VRButton component integration with VRManager
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import VRButton from '../VRButton'
import { VRManager, VRState } from '../../lib/vr'
import {
  createMockViewer,
  mockDeviceOrientationPermission,
  mockUserAgent,
  USER_AGENTS,
} from '../../lib/vr/__tests__/mocks/PhotoSphereViewerMocks'

describe('VRButton Integration Tests', () => {
  let vrManager: VRManager
  let mockContainer: HTMLElement
  let cleanupFunctions: Array<() => void> = []

  beforeEach(() => {
    jest.clearAllMocks()
    cleanupFunctions = []
    
    mockContainer = document.createElement('div')
    mockContainer.requestFullscreen = jest.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (vrManager) {
      vrManager.cleanup()
    }
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
  })

  describe('VR Activation Flow Integration', () => {
    test('should complete full VR activation flow when button is clicked', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Initial state - button should show "Enter VR"
      expect(screen.getByRole('button', { name: /enter vr mode/i })).toBeInTheDocument()

      // Click the button
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Wait for activation to complete
      await waitFor(() => {
        expect(currentState.status).toBe('active')
      })

      // Re-render to reflect state change
      rerender(<VRButton vrManager={vrManager} />)

      // Button should now show "Exit VR"
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()

      // Verify VR components were activated
      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      const gyroPlugin = mockViewer.getPlugin('GyroscopePlugin')
      expect(stereoPlugin.toggle).toHaveBeenCalled()
      expect(gyroPlugin.start).toHaveBeenCalled()
    })

    test('should handle VR deactivation when exit button is clicked', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // First activate VR
      await act(async () => {
        await vrManager.activateVR()
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should show "Exit VR"
      const exitButton = screen.getByRole('button', { name: /exit vr mode/i })
      expect(exitButton).toBeInTheDocument()

      // Click to exit VR
      fireEvent.click(exitButton)

      // Wait for deactivation
      await waitFor(() => {
        expect(currentState.status).toBe('idle')
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should show "Enter VR" again
      expect(screen.getByRole('button', { name: /enter vr mode/i })).toBeInTheDocument()
    })

    test('should show loading state during VR activation', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      // Create a slow stereo plugin to test loading state
      const slowStereoPlugin = createMockViewer().getPlugin('StereoPlugin')
      slowStereoPlugin.toggle = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100))
      })

      mockViewer.getPlugin.mockImplementation((pluginClass) => {
        if (pluginClass === 'StereoPlugin') return slowStereoPlugin
        if (pluginClass === 'GyroscopePlugin') return createMockViewer().getPlugin('GyroscopePlugin')
        return null
      })

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Click the button
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should show loading state
      await waitFor(() => {
        rerender(<VRButton vrManager={vrManager} />)
        expect(screen.getByRole('button', { name: /loading vr mode/i })).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(currentState.status).toBe('active')
      })
    })

    test('should handle iOS permission flow', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('granted')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Click the button
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Wait for permission request and activation
      await waitFor(() => {
        expect(currentState.status).toBe('active')
        expect(currentState.permissionStatus).toBe('granted')
      })

      // Verify permission was requested
      expect((DeviceOrientationEvent as any).requestPermission).toHaveBeenCalled()

      rerender(<VRButton vrManager={vrManager} />)

      // Button should show "Exit VR"
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()
    })

    test('should handle permission denial gracefully', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.IPHONE)
      cleanupFunctions.push(restoreUserAgent)

      const restorePermission = mockDeviceOrientationPermission('denied')
      cleanupFunctions.push(restorePermission)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Click the button
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Wait for permission denial and error state
      await waitFor(() => {
        expect(currentState.status).toBe('error')
        expect(currentState.permissionStatus).toBe('denied')
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should show error state
      expect(screen.getByRole('button', { name: /vr error/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    test('should handle plugin failures gracefully', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      // Create a failing stereo plugin
      const mockViewer = createMockViewer()
      const failingStereoPlugin = mockViewer.getPlugin('StereoPlugin')
      failingStereoPlugin.toggle.mockImplementation(() => {
        throw new Error('Plugin failed')
      })

      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Click the button
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Wait for error state
      await waitFor(() => {
        expect(currentState.status).toBe('error')
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should show error state
      expect(screen.getByRole('button', { name: /vr error/i })).toBeInTheDocument()
      expect(button).toHaveClass('bg-red-600')
    })

    test('should allow retry after error', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const stereoPlugin = mockViewer.getPlugin('StereoPlugin')
      
      // First call fails, second succeeds
      stereoPlugin.toggle
        .mockImplementationOnce(() => {
          throw new Error('Plugin failed')
        })
        .mockImplementationOnce(() => {})

      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // First click - should fail
      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(currentState.status).toBe('error')
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Second click - should succeed
      const errorButton = screen.getByRole('button', { name: /vr error/i })
      fireEvent.click(errorButton)

      await waitFor(() => {
        expect(currentState.status).toBe('active')
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Should show exit VR button
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()
    })
  })

  describe('State Synchronization', () => {
    test('should stay synchronized with VRManager state changes', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Activate VR programmatically (not through button)
      await act(async () => {
        await vrManager.activateVR()
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should reflect the active state
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()

      // Deactivate VR programmatically
      await act(async () => {
        await vrManager.deactivateVR()
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Button should reflect the idle state
      expect(screen.getByRole('button', { name: /enter vr mode/i })).toBeInTheDocument()
    })

    test('should handle rapid state changes', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Rapid toggle operations
      await act(async () => {
        await vrManager.toggleVR() // idle -> active
      })

      rerender(<VRButton vrManager={vrManager} />)
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()

      await act(async () => {
        await vrManager.toggleVR() // active -> idle
      })

      rerender(<VRButton vrManager={vrManager} />)
      expect(screen.getByRole('button', { name: /enter vr mode/i })).toBeInTheDocument()

      await act(async () => {
        await vrManager.toggleVR() // idle -> active
      })

      rerender(<VRButton vrManager={vrManager} />)
      expect(screen.getByRole('button', { name: /exit vr mode/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    test('should maintain accessibility during state changes', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      let currentState: VRState = { status: 'idle', permissionStatus: 'unknown' }

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: (state: VRState) => {
          currentState = state
        },
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      const { rerender } = render(<VRButton vrManager={vrManager} />)

      // Initial accessibility attributes
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toHaveAttribute('aria-label', 'Enter VR mode')

      // Activate VR
      await act(async () => {
        await vrManager.activateVR()
      })

      rerender(<VRButton vrManager={vrManager} />)

      // Updated accessibility attributes
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveAttribute('aria-label', 'Exit VR mode')
    })
  })

  describe('Custom Event Handlers', () => {
    test('should call onStateChange callback', async () => {
      const restoreUserAgent = mockUserAgent(USER_AGENTS.DESKTOP_CHROME)
      cleanupFunctions.push(restoreUserAgent)

      const mockViewer = createMockViewer()
      const onStateChange = jest.fn()

      const config = {
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: () => {},
        stereoPlugin: 'StereoPlugin',
        gyroscopePlugin: 'GyroscopePlugin'
      }

      vrManager = new VRManager(config)

      render(<VRButton vrManager={vrManager} onStateChange={onStateChange} />)

      // Should be called with initial state
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          isActive: false,
          vrStatus: 'idle'
        })
      )

      // Click button to activate VR
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should be called with loading state
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isLoading: true,
            vrStatus: 'requesting'
          })
        )
      })

      // Should be called with active state
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isLoading: false,
            isActive: true,
            vrStatus: 'active'
          })
        )
      })
    })
  })
})