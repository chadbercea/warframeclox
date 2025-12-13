import { Header } from '@/components/header';
import { CetusCycleCard } from '@/components/cetus-cycle-card';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Intro text for first-time visitors */}
        <p className="text-center text-muted-foreground text-sm mb-6 max-w-md">
          Track the Cetus day/night cycle in real-time. Enable notifications to get alerts before transitions.
        </p>

        <CetusCycleCard />

        <Footer />
      </div>
    </main>
  );
}
