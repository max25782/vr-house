'use client'

import dynamic from 'next/dynamic'

// Use the safe wrapped component with VR error boundary protection
const SafePanoramaViewer = dynamic(() => import('../../../components/SafePanoramaViewer'), { ssr: false })

export default function PanoramaTestPage() {
  // Используем изображение из папки willow для тестирования, так как pano.jpg отсутствует
  const src = '/vr/willow/thumbnail.jpg'

  return (
    <main className="min-h-dvh">
      <SafePanoramaViewer 
        src={src} 
        showErrorDetails={process.env.NODE_ENV === 'development'}
      />
    </main>
  )
}


