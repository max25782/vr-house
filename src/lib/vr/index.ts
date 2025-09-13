/**
 * VR Library Index
 * Exports all VR-related components, types, and utilities
 */

// Core VR Manager
export { VRManager } from './VRManager'

// Error Handling System
export { VRErrorHandler } from './VRErrorHandler'
export type { VRErrorHandlerConfig } from './VRErrorHandler'

// Error Reporting and Recovery
export { VRErrorReporter, vrErrorReporter } from './VRErrorReporter'
export type { VRErrorReport, VRErrorBreadcrumb, VRErrorReporterConfig } from './VRErrorReporter'
export { VRErrorRecovery, vrErrorRecovery } from './VRErrorRecovery'
export type { VRRecoveryResult, VRRecoveryOptions } from './VRErrorRecovery'

// Logging System
export { VRLogger } from './VRLogger'
export type { VRLogLevel, VRLogEntry } from './VRLogger'

// Types
export type {
  VRStatus,
  PermissionStatus,
  VRState,
  VRManagerConfig,
  VRError,
  VRErrorCategory,
  VRErrorSeverity,
  VRRecoveryStrategy
} from './types'