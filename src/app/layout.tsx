import './globals.css'
import '@photo-sphere-viewer/core/index.css'

// Добавляем стили для компонентов Photo Sphere Viewer
// Так как CSS-файлы плагинов не доступны напрямую
const photoSphereViewerStyles = `
  /* Стили для стерео-режима (VR) */
  .psv-stereo-button {
    font-size: 20px;
    line-height: 20px;
  }

  .psv-stereo-button::before {
    content: "🥽";
  }

  .psv-container--stereo .psv-canvas {
    position: absolute;
    top: 0;
    right: 0;
    width: 50%;
    height: 100%;
  }

  .psv-container--stereo .psv-canvas:first-child {
    left: 0;
    right: auto;
  }
`
export const metadata = {
  title: 'VR-House',
  description: 'VR house viewer and catalog',
}

import ErrorBoundary from '../components/ErrorBoundary'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: photoSphereViewerStyles }} />
      </head>
      <body className="min-h-dvh bg-white antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}


