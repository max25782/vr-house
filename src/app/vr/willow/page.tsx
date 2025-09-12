'use client'

import dynamic from 'next/dynamic'

// Исправляем путь импорта, убираем алиас @
const CubePanoramaViewer = dynamic(() => import('../../../components/cube-panorama-viewer'), { ssr: false })

export default function WillowScenePage() {
  const basePath = '/vr/willow'

  return (
    <main className="min-h-dvh">
      <CubePanoramaViewer basePath={basePath} files={{ r: 'r.jpg', l: 'l.jpg', u: 'u.jpg', d: 'd.jpg', f: 'f.jpg', b: 'b.jpg' }} />
    </main>
  )
}


