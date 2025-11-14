// // src/components/tester/SectionTwo.tsx
// "use client";

// import Image from "next/image";
// import { useRef } from "react";
// import { motion, useMotionValue, useTransform } from "framer-motion";
// import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

// type Props = { containerSel?: string };
// export default function SectionTwo({ containerSel = ".tester-frame" }: Props) {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const local = useLocalScrollProgress(ref, containerSel);

//   const mv = useMotionValue(local); mv.set(local);
//   const opacity = useTransform(mv, [0, 1], [0, 1]);
//   const scale   = useTransform(mv, [0, 1], [0.96, 1]);
//   const yImg    = useTransform(mv, [0, 1], [100, 0]);

//   return (
//     <section
//       ref={ref}
//       className="relative h-screen w-full overflow-hidden"
//       style={{ background: "#f3efe7", color: "#111" }}
//     >
//       <div className="h-full w-full flex items-center justify-between gap-8 px-12">
//         <motion.div style={{ opacity, scale }} className="max-w-xl">
//           <h2 className="text-4xl font-semibold">Section 2</h2>
//           <p className="mt-2 opacity-70">Local progress: {local.toFixed(2)}</p>
//           <p className="mt-6 text-lg">
//             Copy fades and scales in while the product lifts into position.
//           </p>
//         </motion.div>

//         <motion.div style={{ y: yImg }} className="rounded-2xl overflow-hidden ring-1 ring-black/10">
//           <Image
//             src="/clothing-images/DUJK004-front.png"
//             alt="DUJK004-front"
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
export default function SectionTwo({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel);

  const mv = useMotionValue(local); mv.set(local);
  const opacity = useTransform(mv, [0, 1], [0, 1]);
  const scale   = useTransform(mv, [0, 1], [0.96, 1]);
  const yImg    = useTransform(mv, [0, 1], [100, 0]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden" style={{ background: "#f3efe7", color: "#111" }}>
      <div className="h-full w-full flex items-center justify-between gap-8 px-12">
        <motion.div style={{ opacity, scale }} className="max-w-xl">
          <h2 className="text-4xl font-semibold">Section 2</h2>
          <p className="mt-2 opacity-70">Local progress: {local.toFixed(2)}</p>
          <p className="mt-6 text-lg">Copy fades & scales in while the product lifts.</p>
        </motion.div>

        <motion.div style={{ y: yImg }} className="rounded-2xl overflow-hidden ring-1 ring-black/10">
          <Image src="/clothing-images/DUJK004-front.png" alt="DUJK004-front" width={560} height={740} />
        </motion.div>
      </div>
    </section>
  );
}
