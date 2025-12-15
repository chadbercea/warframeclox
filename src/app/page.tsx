import { CetusClock } from '@/components/cetus-clock';
import { Footer } from '@/components/footer';
import { SpaceBackground } from '@/components/space-background';
import { FloatingMenu } from '@/components/floating-menu';
import { EarthGlobe } from '@/components/earth-globe';
import { ScrollLock } from '@/components/scroll-lock';
// import { AssetDebugger } from '@/components/asset-debugger';

export default function Home() {
  return (
    <main className="h-full w-full flex flex-col relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <ScrollLock />
      <SpaceBackground />
      <EarthGlobe />
      <FloatingMenu />
      {/* <AssetDebugger /> */}

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <CetusClock />
        <Footer />
      </div>
    </main>
  );
}
