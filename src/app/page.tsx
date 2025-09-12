import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold">VR-House</h1>
      <p className="text-muted-foreground mt-2">Next.js App Router + Tailwind + S3-ready.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-1 gap-6">
        <Link href="/vr/willow" className="block p-4 border rounded-lg hover:bg-gray-50">
          <h2 className="text-lg font-medium">Willow Cube Panorama</h2>
          <p className="text-sm text-gray-600 mb-3">6-sided cube panorama using r.jpg, l.jpg, etc.</p>
          <div className="aspect-video relative overflow-hidden rounded bg-gray-100">
            <Image 
              src="/vr/willow/thumbnail.jpg" 
              alt="Willow panorama preview" 
              fill
              className="object-cover"
            />
          </div>
        </Link>
        
       
      </div>
    </main>
  )
}


