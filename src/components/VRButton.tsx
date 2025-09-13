'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { VRManager, VRState, VRStatus } from '../lib/vr'

interface VRButtonProps {
  vrManager: VRManager
  className?: string
  size?: 'small' | 'medium' | 'large'
  position?: 'fixed' | 'relative'
  showLabel?: boolean
  disabled?: boolean
  onStateChange?: (state: VRButtonState) => void
}

interface VRButtonState {
  isLoading: boolean
  isActive: boolean
  error?: string
  vrStatus: VRStatus
}

const VRButton: React.FC<VRButtonProps> = ({
  vrManager,
  className = '',
  size = 'medium',
  position = 'fixed',
  showLabel = true,
  disabled = false,
  onStateChange
}) => {
  const [buttonState, setButtonState] = useState<VRButtonState>({
    isLoading: false,
    isActive: false,
    vrStatus: 'idle'
  })

  // Handle VR state changes from VRManager
  const handleVRStateChange = useCallback((vrState: VRState) => {
    const newButtonState: VRButtonState = {
      isLoading: vrState.status === 'requesting',
      isActive: vrState.status === 'active',
      error: vrState.error,
      vrStatus: vrState.status
    }
    
    setButtonState(newButtonState)
    onStateChange?.(newButtonState)
  }, [onStateChange])

  // Set up VR state listener
  useEffect(() => {
    // Get initial state
    const initialState = vrManager.getState()
    handleVRStateChange(initialState)

    // The VRManager calls onStateChange callback when state changes
    // This is already handled through the vrManager configuration
    return () => {
      // Cleanup if needed
    }
  }, [vrManager, handleVRStateChange])

  // Handle VR button click
  const handleClick = useCallback(async () => {
    if (disabled || buttonState.isLoading) {
      return
    }

    try {
      await vrManager.toggleVR()
    } catch (error) {
      console.error('VR activation failed:', error)
      
      // Ensure we update the button state even if VRManager doesn't
      const errorMessage = error instanceof Error ? error.message : 'Unknown VR error'
      setButtonState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        vrStatus: 'error'
      }))
    }
  }, [vrManager, disabled, buttonState.isLoading])

  // Get button size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-4 py-2 text-sm'
      case 'large':
        return 'px-8 py-4 text-xl'
      default:
        return 'px-6 py-3 text-lg'
    }
  }

  // Get icon size classes
  const getIconSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-4 w-4'
      case 'large':
        return 'h-8 w-8'
      default:
        return 'h-6 w-6'
    }
  }

  // Get position classes
  const getPositionClasses = () => {
    if (position === 'fixed') {
      return 'fixed bottom-4 right-4 z-50'
    }
    return 'relative'
  }

  // Get button state classes
  const getStateClasses = () => {
    if (disabled) {
      return 'bg-gray-400 cursor-not-allowed'
    }

    if (buttonState.error) {
      return 'bg-red-600 hover:bg-red-700 active:bg-red-800'
    }

    if (buttonState.isActive) {
      return 'bg-green-600 hover:bg-green-700 active:bg-green-800'
    }

    if (buttonState.isLoading) {
      return 'bg-blue-500 cursor-wait'
    }

    return 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
  }

  // Get button text
  const getButtonText = () => {
    if (!showLabel) return ''

    if (buttonState.error) {
      return 'VR Error'
    }

    if (buttonState.isActive) {
      return 'Exit VR'
    }

    if (buttonState.isLoading) {
      return 'Loading...'
    }

    return 'Enter VR'
  }

  // Get icon based on state
  const getIcon = () => {
    const iconClasses = `${getIconSizeClasses()} ${showLabel ? 'mr-2' : ''}`

    if (buttonState.error) {
      return (
        <svg 
          className={iconClasses} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
      )
    }

    if (buttonState.isLoading) {
      return (
        <div 
          className={`${iconClasses} animate-spin`}
          aria-hidden="true"
        >
          <svg 
            className="w-full h-full" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )
    }

    // Default VR icon
    return (
      <svg 
        className={iconClasses} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
        />
      </svg>
    )
  }

  // Get ARIA label
  const getAriaLabel = () => {
    if (buttonState.error) {
      return `VR Error: ${buttonState.error}`
    }

    if (buttonState.isActive) {
      return 'Exit VR mode'
    }

    if (buttonState.isLoading) {
      return 'Loading VR mode'
    }

    return 'Enter VR mode'
  }

  return (
    <button
      className={`
        ${getPositionClasses()}
        ${getSizeClasses()}
        ${getStateClasses()}
        text-white font-bold rounded-full shadow-lg
        transition-all duration-200 ease-in-out
        transform hover:scale-105 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50
        disabled:transform-none disabled:hover:scale-100
        flex items-center justify-center
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || buttonState.isLoading}
      aria-label={getAriaLabel()}
      aria-pressed={buttonState.isActive}
      role="button"
      type="button"
      title={getAriaLabel()}
    >
      {getIcon()}
      {showLabel && (
        <span className="font-bold">
          {getButtonText()}
        </span>
      )}
    </button>
  )
}

export default VRButton