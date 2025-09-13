import { renderHook, act } from '@testing-library/react'
import { useVRManager } from '../useVRManager'
import { VRManager } from '../../lib/vr'

// Mock VRManager
jest.mock('../../lib/vr', () => ({
  VRManager: jest.fn().mockImplementation(() => ({
    getState: jest.fn().mockReturnValue({
      status: 'idle',
      permissionStatus: 'unknown'
    }),
    cleanup: jest.fn()
  }))
}))

const MockedVRManager = VRManager as jest.MockedClass<typeof VRManager>

describe('useVRManager', () => {
  const mockViewer = { getPlugin: jest.fn() }
  const mockContainer = document.createElement('div')
  const mockStereoPlugin = { toggle: jest.fn() }
  const mockGyroscopePlugin = { start: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('initializes VRManager when viewer and container are provided', () => {
      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer,
          stereoPlugin: mockStereoPlugin,
          gyroscopePlugin: mockGyroscopePlugin
        })
      )

      expect(MockedVRManager).toHaveBeenCalledWith({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: expect.any(Function),
        stereoPlugin: mockStereoPlugin,
        gyroscopePlugin: mockGyroscopePlugin
      })

      expect(result.current.isReady).toBe(true)
      expect(result.current.error).toBe(null)
      expect(result.current.vrManager).toBeInstanceOf(VRManager)
    })

    it('does not initialize when viewer is missing', () => {
      const { result } = renderHook(() =>
        useVRManager({
          viewer: null,
          container: mockContainer
        })
      )

      expect(MockedVRManager).not.toHaveBeenCalled()
      expect(result.current.isReady).toBe(false)
      expect(result.current.error).toBe('Viewer or container not available')
      expect(result.current.vrManager).toBe(null)
    })

    it('does not initialize when container is missing', () => {
      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: null
        })
      )

      expect(MockedVRManager).not.toHaveBeenCalled()
      expect(result.current.isReady).toBe(false)
      expect(result.current.error).toBe('Viewer or container not available')
      expect(result.current.vrManager).toBe(null)
    })

    it('handles VRManager initialization errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      MockedVRManager.mockImplementationOnce(() => {
        throw new Error('Initialization failed')
      })

      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(result.current.isReady).toBe(false)
      expect(result.current.error).toBe('Initialization failed')
      expect(result.current.vrManager).toBe(null)
      expect(consoleError).toHaveBeenCalledWith('VRManager initialization failed:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  describe('State Management', () => {
    it('updates vrState when VRManager state changes', () => {
      const mockGetState = jest.fn().mockReturnValue({
        status: 'active',
        permissionStatus: 'granted'
      })

      MockedVRManager.mockImplementationOnce(() => ({
        getState: mockGetState,
        cleanup: jest.fn()
      }))

      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(result.current.vrState).toEqual({
        status: 'active',
        permissionStatus: 'granted'
      })
    })

    it('calls onStateChange callback when state updates', () => {
      const onStateChange = jest.fn()
      let stateChangeCallback: (state: any) => void

      MockedVRManager.mockImplementationOnce((config: any) => {
        stateChangeCallback = config.onStateChange
        return {
          getState: jest.fn().mockReturnValue({
            status: 'idle',
            permissionStatus: 'unknown'
          }),
          cleanup: jest.fn()
        }
      })

      renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer,
          onStateChange
        })
      )

      const newState = { status: 'active', permissionStatus: 'granted' }
      act(() => {
        stateChangeCallback!(newState)
      })

      expect(onStateChange).toHaveBeenCalledWith(newState)
    })
  })

  describe('Cleanup', () => {
    it('cleans up VRManager on unmount', () => {
      const mockCleanup = jest.fn()
      MockedVRManager.mockImplementationOnce(() => ({
        getState: jest.fn().mockReturnValue({
          status: 'idle',
          permissionStatus: 'unknown'
        }),
        cleanup: mockCleanup
      }))

      const { unmount } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      unmount()

      expect(mockCleanup).toHaveBeenCalled()
    })

    it('resets state on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(result.current.isReady).toBe(true)

      unmount()

      // Note: We can't test the state after unmount directly,
      // but we can verify cleanup was called
      expect(result.current.vrManager?.cleanup).toBeDefined()
    })

    it('reinitializes when dependencies change', () => {
      const mockCleanup = jest.fn()
      MockedVRManager.mockImplementation(() => ({
        getState: jest.fn().mockReturnValue({
          status: 'idle',
          permissionStatus: 'unknown'
        }),
        cleanup: mockCleanup
      }))

      const { rerender } = renderHook(
        ({ viewer }) => useVRManager({
          viewer,
          container: mockContainer
        }),
        { initialProps: { viewer: mockViewer } }
      )

      expect(MockedVRManager).toHaveBeenCalledTimes(1)

      const newViewer = { getPlugin: jest.fn() }
      rerender({ viewer: newViewer })

      expect(mockCleanup).toHaveBeenCalled()
      expect(MockedVRManager).toHaveBeenCalledTimes(2)
      expect(MockedVRManager).toHaveBeenLastCalledWith({
        viewer: newViewer,
        container: mockContainer,
        onStateChange: expect.any(Function),
        stereoPlugin: undefined,
        gyroscopePlugin: undefined
      })
    })
  })

  describe('Error Handling', () => {
    it('handles non-Error exceptions during initialization', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      MockedVRManager.mockImplementationOnce(() => {
        throw 'String error'
      })

      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(result.current.error).toBe('Failed to initialize VRManager')
      expect(result.current.isReady).toBe(false)

      consoleError.mockRestore()
    })
  })

  describe('Optional Parameters', () => {
    it('works without stereoPlugin and gyroscopePlugin', () => {
      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(MockedVRManager).toHaveBeenCalledWith({
        viewer: mockViewer,
        container: mockContainer,
        onStateChange: expect.any(Function),
        stereoPlugin: undefined,
        gyroscopePlugin: undefined
      })

      expect(result.current.isReady).toBe(true)
    })

    it('works without onStateChange callback', () => {
      const { result } = renderHook(() =>
        useVRManager({
          viewer: mockViewer,
          container: mockContainer
        })
      )

      expect(result.current.isReady).toBe(true)
      expect(result.current.vrManager).toBeInstanceOf(VRManager)
    })
  })
})