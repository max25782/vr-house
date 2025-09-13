'use client'

import React from 'react'
import VRButton from './VRButton'
import { VRManager } from '../lib/vr'

interface VRButtonExamplesProps {
  vrManager: VRManager
}

/**
 * Example component showcasing different VRButton configurations
 * This demonstrates the various props and styling options available
 */
const VRButtonExamples: React.FC<VRButtonExamplesProps> = ({ vrManager }) => {
  return (
    <div className="p-8 space-y-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">VR Button Examples</h1>
      
      {/* Default Fixed Button */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Default Fixed Button</h2>
        <p className="text-gray-600">
          The standard VR button that appears fixed in the bottom-right corner
        </p>
        <div className="relative h-32 bg-gray-800 rounded-lg overflow-hidden">
          <VRButton vrManager={vrManager} />
        </div>
      </section>

      {/* Size Variations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Size Variations</h2>
        <p className="text-gray-600">
          Different button sizes for various use cases
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <VRButton 
            vrManager={vrManager} 
            size="small" 
            position="relative"
            className="m-2"
          />
          <VRButton 
            vrManager={vrManager} 
            size="medium" 
            position="relative"
            className="m-2"
          />
          <VRButton 
            vrManager={vrManager} 
            size="large" 
            position="relative"
            className="m-2"
          />
        </div>
      </section>

      {/* Icon Only Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Icon Only Buttons</h2>
        <p className="text-gray-600">
          Compact buttons showing only the VR icon
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <VRButton 
            vrManager={vrManager} 
            size="small" 
            position="relative"
            showLabel={false}
            className="m-2"
          />
          <VRButton 
            vrManager={vrManager} 
            size="medium" 
            position="relative"
            showLabel={false}
            className="m-2"
          />
          <VRButton 
            vrManager={vrManager} 
            size="large" 
            position="relative"
            showLabel={false}
            className="m-2"
          />
        </div>
      </section>

      {/* Custom Styled Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Custom Styled Buttons</h2>
        <p className="text-gray-600">
          Examples with custom styling and positioning
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rounded square button */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Rounded Square</h3>
            <VRButton 
              vrManager={vrManager} 
              position="relative"
              showLabel={false}
              className="!rounded-lg !w-12 !h-12 !p-0"
            />
          </div>

          {/* Pill-shaped button */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Pill Shape</h3>
            <VRButton 
              vrManager={vrManager} 
              position="relative"
              className="!rounded-full !px-8"
            />
          </div>

          {/* Minimal button */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Minimal Style</h3>
            <VRButton 
              vrManager={vrManager} 
              position="relative"
              className="!bg-transparent !text-blue-600 border-2 border-blue-600 hover:!bg-blue-600 hover:!text-white !shadow-none"
            />
          </div>

          {/* Dark theme button */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Dark Theme</h3>
            <div className="bg-gray-900 p-4 rounded-lg">
              <VRButton 
                vrManager={vrManager} 
                position="relative"
                className="!bg-gray-700 hover:!bg-gray-600 active:!bg-gray-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* State Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Button States</h2>
        <p className="text-gray-600">
          The button automatically updates its appearance based on VR state
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Normal State</h3>
            <VRButton 
              vrManager={vrManager} 
              position="relative"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-600">Disabled State</h3>
            <VRButton 
              vrManager={vrManager} 
              position="relative"
              disabled={true}
            />
          </div>
        </div>
      </section>

      {/* Accessibility Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Accessibility Features</h2>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-3">Built-in Accessibility</h3>
          <ul className="space-y-2 text-blue-700">
            <li>• ARIA labels that update based on button state</li>
            <li>• Keyboard navigation support with focus indicators</li>
            <li>• Screen reader friendly state announcements</li>
            <li>• High contrast focus rings for visibility</li>
            <li>• Semantic button role and pressed state</li>
            <li>• Descriptive tooltips for additional context</li>
          </ul>
        </div>
      </section>

      {/* Integration Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Integration Example</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">Usage in Panorama Viewer</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`// In your panorama component
import VRButton from './VRButton'
import { useVRManager } from '../hooks/useVRManager'

const PanoramaViewer = ({ viewer, container }) => {
  const { vrManager } = useVRManager({
    viewer,
    container,
    stereoPlugin: StereoPlugin,
    gyroscopePlugin: GyroscopePlugin
  })

  return (
    <div className="relative">
      <div ref={containerRef} className="h-screen w-full">
        {/* Panorama content */}
      </div>
      
      {vrManager && (
        <VRButton 
          vrManager={vrManager}
          onStateChange={(state) => {
            console.log('VR state changed:', state)
          }}
        />
      )}
    </div>
  )
}`}
          </pre>
        </div>
      </section>
    </div>
  )
}

export default VRButtonExamples