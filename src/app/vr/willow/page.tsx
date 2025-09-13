'use client'

import dynamic from 'next/dynamic'

// Use the safe wrapped component with VR error boundary protection
const SafeCubePanoramaViewer = dynamic(() => import('../../../components/SafeCubePanoramaViewer'), { ssr: false })

export default function WillowScenePage() {
  const basePath = '/vr/willow'

  return (
    <main className="min-h-dvh">
      <SafeCubePanoramaViewer 
        basePath={basePath} 
        files={{ r: 'r.jpg', l: 'l.jpg', u: 'u.jpg', d: 'd.jpg', f: 'f.jpg', b: 'b.jpg' }} 
        showErrorDetails={process.env.NODE_ENV === 'development'}
      />
    </main>
  )
}


