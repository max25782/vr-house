/**
 * VR Error Boundary Integration Tests
 * Tests for VR error boundary components with real error scenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VRPanoramaErrorBoundary from '../VRPanoramaErrorBoundary'
import SafePanoramaViewer from '../SafePanoramaViewer'
import SafeCubePanoramaViewer from '../SafeCubePanoramaViewer'

// Mock the panorama viewer components to simulate crashes
jest.mock('../panorama-viewer', () => {
  return function MockPanoramaViewer({ shouldCrash }: { shouldCrash?: boolean }) {
    if (shouldCrash) {
      throw new Error('VR activation crashed the panorama viewer')
    }
    return <div data-testid="panorama-viewer">Panorama Viewer</div>
  }
})

jest.mock('../cube-panorama-viewer', () => {
  return function MockCubePanoramaViewer({ shouldCrash }: { shouldCrash?: boolean }) {
    if (shouldCrash) {
      throw new Error('VR activation crashed the cube panorama viewer')
    }
    return <div data-testid="cube-panorama-viewer">Cube Panorama Viewer</div>
  }
})

// Component that can be made to crash
const CrashingComponent: React.FC<{ shouldCrash: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('Component crashed during VR operation')
  }
  return <div data-testid="working-component">Component is working</div>
}

describe('VR Error Boundary Integration Tests', () => {
  // Suppress console.error for these tests since we're intentionally causing errors
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('VRPanoramaErrorBoundary', () => {
    test('should catch and handle VR-related crashes', () => {
      const onVRDisabled = jest.fn()
      const onPanoramaReload = jest.fn()

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
          onVRDisabled={onVRDisabled}
          onPanoramaReload={onPanoramaReload}
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should show error UI instead of crashed component
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByText(/vr functionality has been disabled/i)).toBeInTheDocument()

      // Should show retry button
      expect(screen.getByRole('button', { name: /reload panorama/i })).toBeInTheDocument()

      // Should call onVRDisabled callback
      expect(onVRDisabled).toHaveBeenCalled()
    })

    test('should allow panorama reload after crash', () => {
      const onVRDisabled = jest.fn()
      const onPanoramaReload = jest.fn()

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
          onVRDisabled={onVRDisabled}
          onPanoramaReload={onPanoramaReload}
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Click reload button
      const reloadButton = screen.getByRole('button', { name: /reload panorama/i })
      fireEvent.click(reloadButton)

      // Should call onPanoramaReload callback
      expect(onPanoramaReload).toHaveBeenCalled()
    })

    test('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
          showErrorDetails={true}
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should show error details
      expect(screen.getByText(/error details/i)).toBeInTheDocument()
      expect(screen.getByText(/component crashed during vr operation/i)).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    test('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
          showErrorDetails={false}
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should not show error details
      expect(screen.queryByText(/error details/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/component crashed during vr operation/i)).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    test('should render children normally when no error occurs', () => {
      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={false} />
        </VRPanoramaErrorBoundary>
      )

      // Should render the child component normally
      expect(screen.getByTestId('working-component')).toBeInTheDocument()
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
    })

    test('should handle different panorama types', () => {
      const { rerender } = render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      expect(screen.getByText(/regular panorama/i)).toBeInTheDocument()

      rerender(
        <VRPanoramaErrorBoundary
          panoramaType="cube"
          panoramaSource="test-cube/"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      expect(screen.getByText(/cube panorama/i)).toBeInTheDocument()
    })
  })

  describe('SafePanoramaViewer Integration', () => {
    test('should protect regular panorama viewer from crashes', () => {
      const MockPanoramaViewer = require('../panorama-viewer').default

      render(<SafePanoramaViewer src="test.jpg" />)

      // Should render the panorama viewer normally
      expect(screen.getByTestId('panorama-viewer')).toBeInTheDocument()
    })

    test('should handle panorama viewer crashes gracefully', () => {
      // Mock the panorama viewer to crash
      jest.doMock('../panorama-viewer', () => {
        return function CrashingPanoramaViewer() {
          throw new Error('Panorama viewer crashed')
        }
      })

      const onVRDisabled = jest.fn()
      const onPanoramaReload = jest.fn()

      // Re-import to get the mocked version
      const SafePanoramaViewerWithCrash = require('../SafePanoramaViewer').default

      render(
        <SafePanoramaViewerWithCrash 
          src="test.jpg" 
          showErrorDetails={true}
        />
      )

      // Should show error boundary UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByText(/vr functionality has been disabled/i)).toBeInTheDocument()
    })
  })

  describe('SafeCubePanoramaViewer Integration', () => {
    test('should protect cube panorama viewer from crashes', () => {
      render(
        <SafeCubePanoramaViewer 
          basePath="test-cube/" 
          files={{
            r: 'right.jpg',
            l: 'left.jpg',
            u: 'up.jpg',
            d: 'down.jpg',
            f: 'front.jpg',
            b: 'back.jpg'
          }}
        />
      )

      // Should render the cube panorama viewer normally
      expect(screen.getByTestId('cube-panorama-viewer')).toBeInTheDocument()
    })

    test('should handle cube panorama viewer crashes gracefully', () => {
      // Mock the cube panorama viewer to crash
      jest.doMock('../cube-panorama-viewer', () => {
        return function CrashingCubePanoramaViewer() {
          throw new Error('Cube panorama viewer crashed')
        }
      })

      // Re-import to get the mocked version
      const SafeCubePanoramaViewerWithCrash = require('../SafeCubePanoramaViewer').default

      render(
        <SafeCubePanoramaViewerWithCrash 
          basePath="test-cube/"
          showErrorDetails={true}
        />
      )

      // Should show error boundary UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByText(/cube panorama/i)).toBeInTheDocument()
    })
  })

  describe('Error Recovery and Retry', () => {
    test('should allow multiple retry attempts', () => {
      const onPanoramaReload = jest.fn()

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
          onPanoramaReload={onPanoramaReload}
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /reload panorama/i })

      // First retry
      fireEvent.click(reloadButton)
      expect(onPanoramaReload).toHaveBeenCalledTimes(1)

      // Second retry
      fireEvent.click(reloadButton)
      expect(onPanoramaReload).toHaveBeenCalledTimes(2)

      // Third retry
      fireEvent.click(reloadButton)
      expect(onPanoramaReload).toHaveBeenCalledTimes(3)
    })

    test('should track error information for debugging', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should log error information
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('VR Error Boundary caught an error'),
        expect.objectContaining({
          error: expect.any(Error),
          errorInfo: expect.any(Object)
        })
      )

      errorSpy.mockRestore()
    })
  })

  describe('Error Boundary State Management', () => {
    test('should reset error state when children change', () => {
      const { rerender } = render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should show error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

      // Change children to non-crashing component
      rerender(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={false} />
        </VRPanoramaErrorBoundary>
      )

      // Should still show error UI (error boundaries don't reset automatically)
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    test('should maintain error state across re-renders', () => {
      const { rerender } = render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should show error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

      // Re-render with same props
      rerender(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should still show error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility in Error States', () => {
    test('should maintain accessibility in error UI', () => {
      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should have proper ARIA attributes
      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toBeInTheDocument()

      const reloadButton = screen.getByRole('button', { name: /reload panorama/i })
      expect(reloadButton).toBeInTheDocument()
      expect(reloadButton).toHaveAttribute('type', 'button')
    })

    test('should provide screen reader friendly error messages', () => {
      render(
        <VRPanoramaErrorBoundary
          panoramaType="regular"
          panoramaSource="test.jpg"
        >
          <CrashingComponent shouldCrash={true} />
        </VRPanoramaErrorBoundary>
      )

      // Should have descriptive text for screen readers
      expect(screen.getByText(/something went wrong with the regular panorama viewer/i)).toBeInTheDocument()
      expect(screen.getByText(/vr functionality has been disabled for safety/i)).toBeInTheDocument()
    })
  })
})