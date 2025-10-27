import { MagnetLines } from "@/src/components/Try-on";


export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6 overflow-hidden">
      {/* Magnetic Lines: Fullscreen Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <MagnetLines
  rows={24}
  columns={24}
  containerSize="100%"
  lineColor="#000000"
  lineWidth="0.3vmin"
  lineHeight="3vmin"
  baseAngle={-10}
  visibilityRadius={320} 
/>
      </div>

      {/* Foreground Grid Content */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 max-w-[1400px] w-full">
        <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-md text-white">
          <h2 className="text-3xl font-bold mb-4">Welcome to Cove</h2>
          <p className="text-lg">
            This is a premium AI-powered fashion-tech brand. Experience immersive avatars, luxury streetwear, and personalized fit previews.
          </p>
        </div>

        <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-md text-white">
          <h2 className="text-3xl font-bold mb-4">Try-On Preview</h2>
          <p className="text-lg">
            Drag and explore 3D avatars wearing your fit. See real-time changes, fabric stretch, and size dynamics before buying.
          </p>
        </div>
      </div>
    </section>
  );
}
