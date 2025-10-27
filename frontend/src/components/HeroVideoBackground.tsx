'use client'

import { useEffect, useState } from 'react'

const videoClips = [
  '/videos/video-2.mp4',
  '/videos/video-4.mp4',
  '/videos/video-5.mp4',
  '/videos/video-7.mp4',
]

export default function HeroVideoBackground() {
  const [currentVideo, setCurrentVideo] = useState(videoClips[0])

  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.floor(Math.random() * videoClips.length)
      setCurrentVideo(videoClips[random])
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed top-0 right-0 w-full h-full z-0 pointer-events-none">
      {/* 🎥 Background Video */}
      <video
        key={currentVideo}
        src={currentVideo}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain opacity-80 "
      />

      {/* 🌀 Smooth Diagonal Fade */}
      <div className="absolute top-0 right-0 w-full h-full  bg-gradient-to-l from-transparent to-[00FFFFFF]" />
    </div>
  )
}




// HeroVideoBackground.tsx
// 'use client'

// import { useEffect, useState } from 'react'

// const videoClips = [
//   '/videos/video-1.mp4',
//   '/videos/video-2.mp4',
//   '/videos/video-3.mp4',
//   '/videos/video-4.mp4',
//   '/videos/video-5.mp4',
//   '/videos/video-6.mp4',
//   '/videos/video-7.mp4',
//   '/videos/video-8.mp4',
//   '/videos/video-9.mp4',
// ]

// export default function HeroVideoBackground() {
//   const [currentVideo, setCurrentVideo] = useState(videoClips[0])

//   useEffect(() => {
//     const interval = setInterval(() => {
//       const random = Math.floor(Math.random() * videoClips.length)
//       setCurrentVideo(videoClips[random])
//     }, 15000)

//     return () => clearInterval(interval)
//   }, [])

//   return (
//     <>
//       <div className="fixed top-0 right-0 w-1/2 h-full z-[5] overflow-hidden pointer-events-none">
//         <video
//           key={currentVideo}
//           src={currentVideo}
//           autoPlay
//           loop
//           muted
//           playsInline
//           className="w-full h-full object-cover opacity-60"
//            style={{ mask: 'url(#video-blobs-mask)', WebkitMask: 'url(#video-blobs-mask)' }}
//         />
//       </div>

//       {/* Grain Layer */}
//       <div className="fixed top-0 right-0 w-1/2 h-full z-[6] pointer-events-none grain-overlay" />

//       {/* Animated Mesh Layer */}
//       <div className="fixed top-0 right-0 w-1/2 h-full z-[7] pointer-events-none mask-interactive-layer" />
//     </>
//   )
// }

