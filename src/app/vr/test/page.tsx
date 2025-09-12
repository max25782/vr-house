'use client'

import dynamic from 'next/dynamic'

// Исправляем путь импорта, убираем алиас @
const PanoramaViewer = dynamic(() => import('../../../components/panorama-viewer'), { ssr: false })

export default function PanoramaTestPage() {
  // Используем изображение из папки willow для тестирования, так как pano.jpg отсутствует
  const src = '/vr/willow/thumbnail.jpg'

  return (
    <main className="min-h-dvh">
      <PanoramaViewer src={src} />
    </main>
  )
}


