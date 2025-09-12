'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function TunnelPage() {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function createTunnel() {
      try {
        const res = await fetch('/api/tunnel')
        const data = await res.json()
        
        if (data.error) {
          setError(data.error)
        } else if (data.url) {
          setTunnelUrl(data.url)
        } else {
          setError('Unknown error creating tunnel')
        }
      } catch (err) {
        setError('Failed to create tunnel. Make sure the server is running.')
      } finally {
        setIsLoading(false)
      }
    }
    
    createTunnel()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Mobile Access</h1>
      
      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p>Creating tunnel to your local server...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
          <p className="mt-2">
            Try running this command in your terminal:
            <code className="block p-2 mt-1 bg-gray-100 rounded font-mono">yarn tunnel</code>
          </p>
        </div>
      )}
      
      {tunnelUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="mb-2">Your VR-House is accessible at:</p>
          <a 
            href={tunnelUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block p-2 bg-white border rounded-md text-blue-600 hover:underline mb-4"
          >
            {tunnelUrl}
          </a>
          
          <p className="mb-2">VR Panorama Links:</p>
          <div className="space-y-2">
            <a 
              href={`${tunnelUrl}/vr/willow`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block p-2 bg-white border rounded-md text-blue-600 hover:underline"
            >
              {tunnelUrl}/vr/willow
            </a>
            <a 
              href={`${tunnelUrl}/vr/test`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block p-2 bg-white border rounded-md text-blue-600 hover:underline"
            >
              {tunnelUrl}/vr/test
            </a>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm">
              <strong>Note:</strong> On iOS, you need to tap the "Enable Gyroscope" button to use motion controls.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
