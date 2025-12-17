import { CetusClock } from '@/components/cetus-clock';
import { Footer } from '@/components/footer';
import { SpaceBackground } from '@/components/space-background';
import { FloatingMenu } from '@/components/floating-menu';
import { EarthGlobe } from '@/components/earth-globe';
import { ScrollLock } from '@/components/scroll-lock';
import { ToastTestButton } from '@/components/toast-test-button';
// import { AssetDebugger } from '@/components/asset-debugger';

export default function Home() {
  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: '#000000', touchAction: 'none' }}>
      <ScrollLock />
      <SpaceBackground />
      <EarthGlobe />
      <FloatingMenu />
      <ToastTestButton />
      {/* <AssetDebugger /> */}

      <div className="fixed inset-0 flex flex-col items-center justify-center z-10">
        <CetusClock />
        <Footer />
      </div>
    </main>
  );
}
