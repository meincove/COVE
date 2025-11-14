// // src/components/tester/SectionOne.tsx
// "use client";

// import Image from "next/image";
// import { useRef } from "react";
// import { motion, useMotionValue, useTransform } from "framer-motion";
// import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

// type Props = { containerSel?: string };
// export default function SectionOne({ containerSel = ".tester-frame" }: Props) {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const local = useLocalScrollProgress(ref, containerSel);

//   const mv = useMotionValue(local); mv.set(local);
//   const yFast  = useTransform(mv, [0, 1], [140, -120]);  // faster rise
//   const ySlow  = useTransform(mv, [0, 1], [80,  -60]);   // slower rise
//   const glow   = useTransform(mv, [0, 1], [0.35, 1]);

//   return (
//     <section ref={ref} className="relative h-screen w-full overflow-hidden bg-black text-white">
//       <motion.div
//         style={{ opacity: glow }}
//         className="pointer-events-none absolute inset-0"
//       >
//         <div className="absolute inset-0"
//              style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.12) 0%, rgba(0,0,0,0) 70%)" }} />
//       </motion.div>

//       <div className="relative z-10 h-full w-full flex items-center justify-between gap-8 px-12">
//         <div className="max-w-xl">
//           <h2 className="text-4xl font-semibold">Section 1</h2>
//           <p className="mt-2 opacity-80">Local progress: {local.toFixed(2)}</p>
//           <p className="mt-6 text-lg opacity-90">
//             Two layers rise at different speeds (clear parallax).
//           </p>
//         </div>

//         <div className="flex items-end gap-6">
//           <motion.div style={{ y: yFast }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
//             <Image
//               src="/clothing-images/OBMR003-front.png"
//               alt="OBMR003-front"
//               width={440}
//               height={560}
//               priority
//             />
//           </motion.div>
//           <motion.div style={{ y: ySlow }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
//             <Image
//               src="/clothing-images/CUHD001-front.png"
//               alt="CUHD001-front"
//               width={420}
//               height={540}
//               priority
//             />
//           </motion.div>
//         </div>
//       </div>
//     </section>
//   );
// }



"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

type Props = { containerSel?: string };
export default function SectionOne({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel);

  const mv = useMotionValue(local); mv.set(local);
  const yFast = useTransform(mv, [0, 1], [140, -120]);
  const ySlow = useTransform(mv, [0, 1], [80, -60]);
  const glow  = useTransform(mv, [0, 1], [0.35, 1]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden bg-black text-white">
      <motion.div style={{ opacity: glow }} className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.12) 0%, rgba(0,0,0,0) 70%)" }}
        />
      </motion.div>

      <div className="relative z-10 h-full w-full flex items-center justify-between gap-8 px-12">
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold">Section 1</h2>
          <p className="mt-2 opacity-80">Local progress: {local.toFixed(2)}</p>
          <p className="mt-6 text-lg opacity-90">Two layers rise at different speeds (parallax).</p>
        </div>

        <div className="flex items-end gap-6">
          <motion.div style={{ y: yFast }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
            <Image src="/clothing-images/OBMR003-front.png" alt="OBMR003-front" width={440} height={560} priority />
          </motion.div>
          <motion.div style={{ y: ySlow }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
            <Image src="/clothing-images/CUHD001-front.png" alt="CUHD001-front" width={420} height={540} priority />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
