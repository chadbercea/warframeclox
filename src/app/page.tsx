import { CetusClock } from '@/components/cetus-clock';
import { Footer } from '@/components/footer';
import { SpaceBackground } from '@/components/space-background';
import { FloatingMenu } from '@/components/floating-menu';
import { EarthGlobe } from '@/components/earth-globe';
import { AssetDebugger } from '@/components/asset-debugger';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#000000' }}>
      <SpaceBackground />
      <EarthGlobe />
      <FloatingMenu />
      <AssetDebugger />

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <CetusClock />
        <Footer />
      </div>
    </main>
  );
}
