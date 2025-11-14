// // src/components/tester/SectionThree.tsx
// "use client";

// import Image from "next/image";
// import { useRef } from "react";
// import { motion, useMotionValue, useTransform } from "framer-motion";
// import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

// type Props = { containerSel?: string };
// export default function SectionThree({ containerSel = ".tester-frame" }: Props) {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const local = useLocalScrollProgress(ref, containerSel);

//   const mv = useMotionValue(local); mv.set(local);
//   const x      = useTransform(mv, [0, 1], ["18%", "0%"]);
//   const filter = useTransform(mv, [0, 1], ["blur(8px)", "blur(0px)"]);

//   return (
//     <section className="relative h-screen w-full overflow-hidden bg-slate-950 text-white" ref={ref}>
//       <div className="h-full w-full flex items-center justify-between gap-8 px-12">
//         <motion.div style={{ x, filter }} className="max-w-xl">
//           <h2 className="text-4xl font-semibold">Section 3</h2>
//           <p className="mt-2 opacity-80">Local progress: {local.toFixed(2)}</p>
//           <p className="mt-6 text-lg opacity-90">
//             Feels like a new page sliding in from the right as you scroll.
//           </p>
//         </motion.div>

//         <motion.div style={{ x, filter }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
//           <Image
//             src="/clothing-images/OBMR005-front.png"
//             alt="OBMR005-front"
//             width={560}
//             height={740}
//           />
//         </motion.div>
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
export default function SectionThree({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel);

  const mv = useMotionValue(local); mv.set(local);
  const x      = useTransform(mv, [0, 1], ["18%", "0%"]);
  const filter = useTransform(mv, [0, 1], ["blur(8px)", "blur(0px)"]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="h-full w-full flex items-center justify-between gap-8 px-12">
        <motion.div style={{ x, filter }} className="max-w-xl">
          <h2 className="text-4xl font-semibold">Section 3</h2>
          <p className="mt-2 opacity-80">Local progress: {local.toFixed(2)}</p>
          <p className="mt-6 text-lg opacity-90">Feels like a page sliding in from the right.</p>
        </motion.div>

        <motion.div style={{ x, filter }} className="rounded-2xl overflow-hidden ring-1 ring-white/10">
          <Image src="/clothing-images/OBMR005-front.png" alt="OBMR005-front" width={560} height={740} />
        </motion.div>
      </div>
    </section>
  );
}
