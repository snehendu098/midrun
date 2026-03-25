import Navbar from "@/components/common/nav";
import PlaygroundInteractions from "@/components/playground/interactions";
import RocketView from "@/components/playground/rocket-view";
import { GameProvider } from "@/contexts/GameContext";

export default function Home() {
  return (
    <GameProvider>
      <div className="w-screen min-h-screen relative">
        {/* Nav */}
        <Navbar />
        {/* Grid */}
        <div className="p-4 pt-0 lg:grid-cols-5 grid-cols-1 grid gap-4">
          <PlaygroundInteractions />
          <RocketView />
        </div>
      </div>
    </GameProvider>
  );
}
