import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VRButton from '../VRButton'
import { VRManager, VRState } from '../../lib/vr'

// Mock VRManager
const mockVRManager = {
  getState: jest.fn(),
  toggleVR: jest.fn(),
  cleanup: jest.fn()
} as unknown as VRManager

// Mock VR states
const mockIdleState: VRState = {
  status: 'idle',
  permissionStatus: 'unknown'
}

const mockLoadingState: VRState = {
  status: 'requesting',
  permissionStatus: 'granted'
}

const mockActiveState: VRState = {
  status: 'active',
  permissionStatus: 'granted'
}

const mockErrorState: VRState = {
  status: 'error',
  permissionStatus: 'denied',
  error: 'Permission denied'
}

describe('VRButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockIdleState)
  })

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button', { name: /enter vr mode/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Enter VR')
    })

    it('renders without label when showLabel is false', () => {
      render(<VRButton vrManager={mockVRManager} showLabel={false} />)
      
      const button = screen.getByRole('button', { name: /enter vr mode/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toHaveTextContent('Enter VR')
    })

    it('applies custom className', () => {
      render(<VRButton vrManager={mockVRManager} className="custom-class" />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders with different sizes', () => {
      const { rerender } = render(<VRButton vrManager={mockVRManager} size="small" />)
      let button = screen.getByRole('button')
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm')

      rerender(<VRButton vrManager={mockVRManager} size="large" />)
      button = screen.getByRole('button')
      expect(button).toHaveClass('px-8', 'py-4', 'text-xl')
    })

    it('renders with different positions', () => {
      const { rerender } = render(<VRButton vrManager={mockVRManager} position="fixed" />)
      let button = screen.getByRole('button')
      expect(button).toHaveClass('fixed', 'bottom-4', 'right-4')

      rerender(<VRButton vrManager={mockVRManager} position="relative" />)
      button = screen.getByRole('button')
      expect(button).toHaveClass('relative')
      expect(button).not.toHaveClass('fixed')
    })
  })

  describe('State Management', () => {
    it('displays loading state correctly', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockLoadingState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button', { name: /loading vr mode/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Loading...')
      expect(button).toBeDisabled()
    })

    it('displays active state correctly', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockActiveState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button', { name: /exit vr mode/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Exit VR')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('displays error state correctly', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockErrorState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button', { name: /vr error: permission denied/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('VR Error')
    })

    it('calls onStateChange when state updates', () => {
      const onStateChange = jest.fn()
      
      render(<VRButton vrManager={mockVRManager} onStateChange={onStateChange} />)
      
      expect(onStateChange).toHaveBeenCalledWith({
        isLoading: false,
        isActive: false,
        vrStatus: 'idle'
      })
    })
  })

  describe('Interactions', () => {
    it('calls vrManager.toggleVR when clicked', async () => {
      ;(mockVRManager.toggleVR as jest.Mock).mockResolvedValue(undefined)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockVRManager.toggleVR).toHaveBeenCalledTimes(1)
      })
    })

    it('does not call toggleVR when disabled', async () => {
      render(<VRButton vrManager={mockVRManager} disabled />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockVRManager.toggleVR).not.toHaveBeenCalled()
      })
    })

    it('does not call toggleVR when loading', async () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockLoadingState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockVRManager.toggleVR).not.toHaveBeenCalled()
      })
    })

    it('handles toggleVR errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      ;(mockVRManager.toggleVR as jest.Mock).mockRejectedValue(new Error('VR failed'))
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('VR activation failed:', expect.any(Error))
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Enter VR mode')
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('updates ARIA attributes based on state', () => {
      const { rerender } = render(<VRButton vrManager={mockVRManager} />)
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'false')

      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockActiveState)
      rerender(<VRButton vrManager={mockVRManager} />)
      
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('has focus styles', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-4', 'focus:ring-blue-300')
    })

    it('has proper title attribute', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Enter VR mode')
    })
  })

  describe('Visual States', () => {
    it('applies correct classes for idle state', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'active:bg-blue-800')
    })

    it('applies correct classes for loading state', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockLoadingState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-blue-500', 'cursor-wait')
    })

    it('applies correct classes for active state', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockActiveState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-green-600', 'hover:bg-green-700', 'active:bg-green-800')
    })

    it('applies correct classes for error state', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockErrorState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-red-600', 'hover:bg-red-700', 'active:bg-red-800')
    })

    it('applies correct classes for disabled state', () => {
      render(<VRButton vrManager={mockVRManager} disabled />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gray-400', 'cursor-not-allowed')
    })
  })

  describe('Icons', () => {
    it('displays loading spinner when loading', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockLoadingState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const spinner = screen.getByRole('button').querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('displays error icon when in error state', () => {
      ;(mockVRManager.getState as jest.Mock).mockReturnValue(mockErrorState)
      
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      const errorIcon = button.querySelector('svg path[d*="M12 9v2m0 4h.01"]')
      expect(errorIcon).toBeInTheDocument()
    })

    it('displays VR icon in normal states', () => {
      render(<VRButton vrManager={mockVRManager} />)
      
      const button = screen.getByRole('button')
      const vrIcon = button.querySelector('svg path[d*="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"]')
      expect(vrIcon).toBeInTheDocument()
    })
  })
})