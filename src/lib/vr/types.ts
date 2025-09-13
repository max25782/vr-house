/**
 * VR Manager Types
 * Defines interfaces and types for centralized VR state management
 */

export type VRStatus = 'idle' | 'requesting' | 'active' | 'error'
export type PermissionStatus = 'unknown' | 'granted' | 'denied'

export interface VRState {
  status: VRStatus
  permissionStatus: PermissionStatus
  error?: string
}

export interface VRManagerConfig {
  viewer: any // Photo Sphere Viewer instance
  container: HTMLElement
  onStateChange: (state: VRState) => void
  stereoPlugin?: any // StereoPlugin class reference
  gyroscopePlugin?: any // GyroscopePlugin class reference
}

export type VRErrorCategory = 'permission' | 'plugin' | 'timeout' | 'compatibility'
export type VRErrorSeverity = 'low' | 'medium' | 'high'
export type VRRecoveryStrategy = 'retry' | 'reset_permissions' | 'reinitialize_plugin' | 'fallback_mode' | 'user_intervention' | 'none'

export interface VRError {
  id: string
  type: VRErrorCategory // Maintain backward compatibility
  category: VRErrorCategory
  message: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: Date
  severity: VRErrorSeverity
  recoveryStrategy: VRRecoveryStrategy
  userMessage: string
}

// Re-export error handler and logger types
export type { VRLogLevel, VRLogEntry } from './VRLogger'