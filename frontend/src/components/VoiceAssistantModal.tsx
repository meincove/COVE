// // 'use client'

// // import { useState } from 'react'
// // import { motion, AnimatePresence } from 'framer-motion'
// // import { Mic, X } from 'lucide-react'

// // interface VoiceAssistantModalProps {
// //   isOpen: boolean
// //   onClose: () => void
// // }

// // export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
// //   const [messages] = useState([
// //     { from: 'cove', text: 'Hi! How can I help you today?' },
// //     { from: 'user', text: 'Show me black hoodies.' },
// //   ])

// //   return (
// //     <AnimatePresence>
// //       {isOpen && (
// //         <motion.div
// //           className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center"
// //           initial={{ opacity: 0 }}
// //           animate={{ opacity: 1 }}
// //           exit={{ opacity: 0 }}
// //           onClick={onClose}
// //         >
// //           <motion.div
// //             className="bg-white rounded-xl w-full max-w-md h-[500px] shadow-xl flex flex-col"
// //             initial={{ y: '100%' }}
// //             animate={{ y: 0 }}
// //             exit={{ y: '100%' }}
// //             transition={{ type: 'spring', stiffness: 150, damping: 20 }}
// //             onClick={(e) => e.stopPropagation()}
// //           >
// //             {/* Header */}
// //             <div className="p-4 border-b flex justify-between items-center">
// //               <h2 className="font-semibold text-lg">Ask Cove</h2>
// //               <button onClick={onClose}><X className="w-5 h-5" /></button>
// //             </div>

// //             {/* Chat messages */}
// //             <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
// //               {messages.map((msg, i) => (
// //                 <div
// //                   key={i}
// //                   className={`px-3 py-2 rounded-xl max-w-[80%] ${
// //                     msg.from === 'user' ? 'bg-gray-200 self-end ml-auto' : 'bg-gray-100'
// //                   }`}
// //                 >
// //                   {msg.text}
// //                 </div>
// //               ))}
// //             </div>

// //             {/* Input bar */}
// //             <div className="p-4 border-t flex items-center gap-2">
// //               <input
// //                 className="flex-1 border rounded-full px-4 py-2 text-sm outline-none"
// //                 placeholder="Type or speak..."
// //                 disabled
// //               />
// //               <button className="p-2 bg-black text-white rounded-full hover:bg-gray-800">
// //                 <Mic className="w-4 h-4" />
// //               </button>
// //             </div>
// //           </motion.div>
// //         </motion.div>
// //       )}
// //     </AnimatePresence>
// //   )
// // }





// 'use client'

// import { useState } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
// import { Mic, X } from 'lucide-react'
// import dynamic from 'next/dynamic'

// // Lazy-load the particle animation
// const CoveParticleSphere = dynamic(() => import('@/src/components/ui/particleSphere/CoveParticleSphere'), { ssr: false })

// interface VoiceAssistantModalProps {
//   isOpen: boolean
//   onClose: () => void
// }

// export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
//   const [messages] = useState([
//     { from: 'cove', text: 'Hi! How can I help you today?' },
//     { from: 'user', text: 'Show me black hoodies.' },
//   ])

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <motion.div
//           className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           onClick={onClose}
//         >
//           <motion.div
//             className="relative bg-white rounded-xl w-full max-w-md h-[500px] shadow-xl flex flex-col overflow-hidden"
//             initial={{ y: '100%' }}
//             animate={{ y: 0 }}
//             exit={{ y: '100%' }}
//             transition={{ type: 'spring', stiffness: 150, damping: 20 }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* 🌀 Particle background */}
//             <div className="absolute inset-0 z-0">
//               <CoveParticleSphere />
//             </div>

//             <div>
//               Hiiii
//             </div>

//             {/* UI content on top of animation */}
//             <div className="absolute inset-0 z-10 flex flex-col">
//               {/* Header */}
//               <div className="p-4 border-b flex justify-between items-center bg-white/70 backdrop-blur-sm">
//                 <h2 className="font-semibold text-lg">Ask Cove</h2>
//                 <button onClick={onClose}><X className="w-5 h-5" /></button>
//               </div>

//               {/* Chat messages */}
//               <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm bg-white/70 backdrop-blur-sm">
//                 {messages.map((msg, i) => (
//                   <div
//                     key={i}
//                     className={`px-3 py-2 rounded-xl max-w-[80%] ${
//                       msg.from === 'user' ? 'bg-gray-200 self-end ml-auto' : 'bg-gray-100'
//                     }`}
//                   >
//                     {msg.text}
//                   </div>
//                 ))}
//               </div>

//               {/* Input bar */}
//               <div className="p-4 border-t flex items-center gap-2 bg-white/70 backdrop-blur-sm">
//                 <input
//                   className="flex-1 border rounded-full px-4 py-2 text-sm outline-none"
//                   placeholder="Type or speak..."
//                   disabled
//                 />
//                 <button className="p-2 bg-black text-white rounded-full hover:bg-gray-800">
//                   <Mic className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   )
// }



'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import CoveParticleSphere from '@/src/components/ui/particleSphere/CoveParticleSphereCanvas'

interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0"
            onClick={(e) => e.stopPropagation()}
          >
            <CoveParticleSphere />
          </motion.div>

          {/* Close Button */}
          <button
            className="absolute top-4 right-4 z-[210] bg-white text-black rounded-full p-2 hover:bg-gray-200"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
