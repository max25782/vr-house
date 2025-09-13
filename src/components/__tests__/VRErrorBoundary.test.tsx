/**
 * VRErrorBoundary Tests
 * Tests for VR error boundary component functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VRErrorBoundary } from '../VRErrorBoundary'
import { VRError } from '../../lib/vr/types'

// Mock component that throws errors
const ThrowError = ({ shouldThrow, errorMessage }: { shouldThrow: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error')
  }
  return <div>No error</div>
}

// Mock console methods
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

describe('VRErrorBoundary', () => {
  describe('Normal Operation', () => {
    test('should render children when no error occurs', () => {
      render(
        <VRErrorBoundary>
          <ThrowError shouldThrow={false} />
        </VRErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    test('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>

      render(
        <VRErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('should catch and display permission errors', () => {
      render(
        <VRErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="Permission denied for gyroscope" />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()
      expect(screen.getByText('Необходимо разрешение на использование гироскопа для VR-режима')).toBeInTheDocument()
      expect(screen.getByText('🔒')).toBeInTheDocument()
    })

    test('should catch and display plugin errors', () => {
      render(
        <VRErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="StereoPlugin initialization failed" />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()
      expect(screen.getByText('Ошибка инициализации VR-плагина')).toBeInTheDocument()
      expect(screen.getByText('🔧')).toBeInTheDocument()
    })

    test('should catch and display timeout errors', () => {
      render(
        <VRErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="VR activation timeout exceeded" />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()
      expect(screen.getByText('Превышено время ожидания активации VR-режима')).toBeInTheDocument()
      expect(screen.getByText('⏱️')).toBeInTheDocument()
    })

    test('should catch and display compatibility errors', () => {
      render(
        <VRErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="WebXR not supported" />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()
      expect(screen.getByText('VR-режим не поддерживается в данном браузере')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    test('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn()

      render(
        <VRErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </VRErrorBoundary>
      )

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          category: expect.any(String),
          message: 'Test error',
          severity: expect.any(String)
        })
      )
    })
  })

  describe('Recovery Actions', () => {
    test('should allow retry when under max retry limit', () => {
      render(
        <VRErrorBoundary maxRetries={3}>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      const retryButton = screen.getByText(/Попробовать снова/)
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveTextContent('3 попыток осталось')
    })

    test('should handle retry action', async () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true)
        
        React.useEffect(() => {
          // Simulate fixing the error after first render
          const timer = setTimeout(() => setShouldThrow(false), 100)
          return () => clearTimeout(timer)
        }, [])

        return <ThrowError shouldThrow={shouldThrow} />
      }

      render(
        <VRErrorBoundary maxRetries={3}>
          <TestComponent />
        </VRErrorBoundary>
      )

      // Should show error initially
      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()

      // Click retry
      const retryButton = screen.getByText(/Попробовать снова/)
      fireEvent.click(retryButton)

      // Should eventually show success
      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument()
      })
    })

    test('should handle reset action', () => {
      render(
        <VRErrorBoundary>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      expect(screen.getByText('Ошибка VR-режима')).toBeInTheDocument()

      const resetButton = screen.getByText('Сбросить и продолжить без VR')
      fireEvent.click(resetButton)

      // Should clear error state and show children
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    test('should handle refresh action', () => {
      // Mock window.location.reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(
        <VRErrorBoundary>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      const refreshButton = screen.getByText('Обновить страницу')
      fireEvent.click(refreshButton)

      expect(mockReload).toHaveBeenCalled()
    })

    test('should disable retry when max retries reached', () => {
      render(
        <VRErrorBoundary maxRetries={0}>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      expect(screen.queryByText(/Попробовать снова/)).not.toBeInTheDocument()
      expect(screen.getByText('Сбросить и продолжить без VR')).toBeInTheDocument()
    })
  })

  describe('Error Details', () => {
    test('should show error details when showErrorDetails is true', () => {
      render(
        <VRErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="Detailed test error" />
        </VRErrorBoundary>
      )

      const detailsToggle = screen.getByText('Подробности ошибки')
      expect(detailsToggle).toBeInTheDocument()

      fireEvent.click(detailsToggle)

      expect(screen.getByText('Detailed test error')).toBeInTheDocument()
      expect(screen.getByText(/Категория:/)).toBeInTheDocument()
      expect(screen.getByText(/Серьезность:/)).toBeInTheDocument()
    })

    test('should hide error details when showErrorDetails is false', () => {
      render(
        <VRErrorBoundary showErrorDetails={false}>
          <ThrowError shouldThrow={true} />
        </VRErrorBoundary>
      )

      expect(screen.queryByText('Подробности ошибки')).not.toBeInTheDocument()
    })
  })

  describe('Error Categorization', () => {
    test('should correctly categorize permission errors', () => {
      const onErrorMock = jest.fn()

      render(
        <VRErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="DeviceMotionEvent permission denied" />
        </VRErrorBoundary>
      )

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          category: 'permission',
          severity: 'high',
          recoveryStrategy: 'reset_permissions'
        })
      )
    })

    test('should correctly categorize plugin errors', () => {
      const onErrorMock = jest.fn()

      render(
        <VRErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="StereoPlugin failed to initialize" />
        </VRErrorBoundary>
      )

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          category: 'plugin',
          severity: 'high',
          recoveryStrategy: 'reinitialize_plugin'
        })
      )
    })

    test('should correctly categorize timeout errors', () => {
      const onErrorMock = jest.fn()

      render(
        <VRErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Operation timeout exceeded" />
        </VRErrorBoundary>
      )

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          category: 'timeout',
          severity: 'medium',
          recoveryStrategy: 'retry'
        })
      )
    })
  })

  describe('Error Reporting', () => {
    test('should log error reports to console', () => {
      render(
        <VRErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error for reporting" />
        </VRErrorBoundary>
      )

      expect(console.warn).toHaveBeenCalledWith(
        'VR Error Report:',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error for reporting'
          }),
          vrError: expect.objectContaining({
            category: expect.any(String)
          }),
          userAgent: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })
  })
})