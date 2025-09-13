'use client'

import React, { useState } from 'react'
import VRErrorBoundary from './VRErrorBoundary'
import VRPanoramaErrorBoundary from './VRPanoramaErrorBoundary'
import withVRErrorBoundary from './withVRErrorBoundary'
import useVRErrorHandler from '../hooks/useVRErrorHandler'

// Mock component that can throw different types of VR errors
const VRErrorSimulator = ({ errorType }: { errorType: string | null }) => {
  if (errorType === 'permission') {
    throw new Error('DeviceMotionEvent permission denied')
  }
  if (errorType === 'plugin') {
    throw new Error('StereoPlugin initialization failed')
  }
  if (errorType === 'timeout') {
    throw new Error('VR activation timeout exceeded')
  }
  if (errorType === 'compatibility') {
    throw new Error('WebXR not supported in this browser')
  }
  
  return (
    <div className="p-4 bg-green-100 text-green-800 rounded">
      ✅ VR component working normally
    </div>
  )
}

// Component using the useVRErrorHandler hook
const VRComponentWithHook = () => {
  const {
    hasError,
    error,
    canRetry,
    retry,
    reset,
    wrapVROperation,
    getErrorMessage,
    getRecoverySuggestions
  } = useVRErrorHandler({
    maxRetries: 2,
    onError: (error) => console.log('Hook caught error:', error),
    onRecovery: () => console.log('Hook recovered from error')
  })

  const simulateVROperation = async (shouldFail: boolean) => {
    await wrapVROperation(async () => {
      if (shouldFail) {
        throw new Error('Simulated VR operation failure')
      }
      return 'VR operation successful'
    }, 'plugin')
  }

  if (hasError) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        <h4 className="font-semibold mb-2">Hook Error Handler</h4>
        <p className="mb-2">{getErrorMessage()}</p>
        
        <div className="mb-2">
          <strong>Recovery suggestions:</strong>
          <ul className="list-disc list-inside">
            {getRecoverySuggestions().map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        <div className="space-x-2">
          {canRetry && (
            <button
              onClick={retry}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
          <button
            onClick={reset}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-100 text-blue-800 rounded">
      <h4 className="font-semibold mb-2">Hook Error Handler</h4>
      <p className="mb-2">Component using useVRErrorHandler hook</p>
      <div className="space-x-2">
        <button
          onClick={() => simulateVROperation(false)}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Successful Operation
        </button>
        <button
          onClick={() => simulateVROperation(true)}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Failing Operation
        </button>
      </div>
    </div>
  )
}

// Component wrapped with HOC
const SafeVRComponent = withVRErrorBoundary(VRErrorSimulator, {
  maxRetries: 2,
  showErrorDetails: true,
  onError: (error, errorInfo, vrError) => {
    console.log('HOC caught error:', { error, errorInfo, vrError })
  }
})

/**
 * Examples demonstrating VR error boundary usage
 */
export default function VRErrorBoundaryExamples() {
  const [basicErrorType, setBasicErrorType] = useState<string | null>(null)
  const [panoramaErrorType, setPanoramaErrorType] = useState<string | null>(null)
  const [hocErrorType, setHocErrorType] = useState<string | null>(null)

  const errorTypes = [
    { value: null, label: 'No Error' },
    { value: 'permission', label: 'Permission Error' },
    { value: 'plugin', label: 'Plugin Error' },
    { value: 'timeout', label: 'Timeout Error' },
    { value: 'compatibility', label: 'Compatibility Error' }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">VR Error Boundary Examples</h1>
        <p className="text-gray-600">
          Demonstrating different ways to handle VR errors in React components
        </p>
      </div>

      {/* Basic VRErrorBoundary */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Basic VRErrorBoundary</h2>
        <p className="text-gray-600">
          Standard error boundary with default fallback UI and recovery options
        </p>
        
        <div className="flex space-x-2 mb-4">
          {errorTypes.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setBasicErrorType(value)}
              className={`px-3 py-1 rounded ${
                basicErrorType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <VRErrorBoundary
          maxRetries={3}
          showErrorDetails={true}
          onError={(error, errorInfo, vrError) => {
            console.log('Basic boundary caught:', { error, errorInfo, vrError })
          }}
        >
          <VRErrorSimulator errorType={basicErrorType} />
        </VRErrorBoundary>
      </section>

      {/* VRPanoramaErrorBoundary */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. VRPanoramaErrorBoundary</h2>
        <p className="text-gray-600">
          Specialized error boundary for panorama viewers with VR-specific recovery
        </p>
        
        <div className="flex space-x-2 mb-4">
          {errorTypes.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setPanoramaErrorType(value)}
              className={`px-3 py-1 rounded ${
                panoramaErrorType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <VRPanoramaErrorBoundary
          panoramaType="cube"
          panoramaSource="/vr/test/"
          onVRDisabled={() => console.log('VR disabled for panorama')}
          onPanoramaReload={() => console.log('Panorama reload requested')}
        >
          <VRErrorSimulator errorType={panoramaErrorType} />
        </VRPanoramaErrorBoundary>
      </section>

      {/* Higher-Order Component */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. withVRErrorBoundary HOC</h2>
        <p className="text-gray-600">
          Component wrapped with error boundary using higher-order component pattern
        </p>
        
        <div className="flex space-x-2 mb-4">
          {errorTypes.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setHocErrorType(value)}
              className={`px-3 py-1 rounded ${
                hocErrorType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <SafeVRComponent errorType={hocErrorType} />
      </section>

      {/* useVRErrorHandler Hook */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. useVRErrorHandler Hook</h2>
        <p className="text-gray-600">
          Programmatic error handling within components using custom hook
        </p>
        
        <VRComponentWithHook />
      </section>

      {/* Custom Fallback */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Custom Fallback UI</h2>
        <p className="text-gray-600">
          Error boundary with completely custom fallback component
        </p>
        
        <VRErrorBoundary
          fallback={
            <div className="p-6 bg-purple-100 text-purple-800 rounded-lg text-center">
              <div className="text-4xl mb-2">🎭</div>
              <h3 className="text-lg font-semibold mb-2">Custom VR Error UI</h3>
              <p>This is a completely custom error fallback!</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Reload Page
              </button>
            </div>
          }
        >
          <VRErrorSimulator errorType="plugin" />
        </VRErrorBoundary>
      </section>

      {/* Usage Guidelines */}
      <section className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Usage Guidelines</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>VRErrorBoundary:</strong> Use for general VR components that need error protection
          </div>
          <div>
            <strong>VRPanoramaErrorBoundary:</strong> Use specifically for panorama viewers with VR functionality
          </div>
          <div>
            <strong>withVRErrorBoundary:</strong> Use when you want to wrap existing components with error boundaries
          </div>
          <div>
            <strong>useVRErrorHandler:</strong> Use for programmatic error handling within components
          </div>
        </div>
      </section>
    </div>
  )
}