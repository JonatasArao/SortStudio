import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Header } from '../organisms/Header';
import { WheelDisplay } from '../organisms/WheelDisplay';
import { HorizonDisplay } from '../organisms/HorizonDisplay';
import { MysteryBoxDisplay } from '../organisms/MysteryBoxDisplay';
import { RaceDisplay } from '../organisms/RaceDisplay';
import { PenaltyShootoutDisplay } from '../organisms/PenaltyShootoutDisplay';
import { BingoDisplay } from '../organisms/BingoDisplay';
import { Sidebar } from '../organisms/Sidebar';
import { SettingsModal } from '../organisms/SettingsModal';
import { WinnerModal } from '../organisms/WinnerModal';
import { Confetti } from '../atoms/Confetti';
import { EntrySettingsModal } from '../organisms/EntrySettingsModal';
import { AddAudioModal } from '../organisms/settings/AddAudioModal';
import { ResultsModal } from '../organisms/ResultsModal';
import { ExportModal } from '../organisms/settings/ExportModal';
import { useGameLoop } from '../../hooks/useGameLoop';
import { EliminationFeed } from '../organisms/EliminationFeed';

export const HomePage = () => {
  const winner = useAppStore(s => s.winner);
  const showConfetti = useAppStore(s => s.showConfetti);
  const isAddAudioModalOpen = useAppStore(s => s.isAddAudioModalOpen);
  const setIsAddAudioModalOpen = useAppStore(s => s.setIsAddAudioModalOpen);
  const wheelType = useAppStore(s => s.wheelType);

  useGameLoop();

  return (
    <div className="h-[100dvh] w-full bg-[#14151a] text-slate-200 flex flex-col font-sans overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-row overflow-hidden min-h-0 relative">
        {wheelType === 'horizon' ? <HorizonDisplay /> : wheelType === 'mystery_box' ? <MysteryBoxDisplay /> : wheelType === 'race' ? <RaceDisplay /> : wheelType === 'penalty_shootout' ? <PenaltyShootoutDisplay /> : wheelType === 'bingo' ? <BingoDisplay /> : <WheelDisplay />}
        <Sidebar />
        <EliminationFeed />
      </main>

      <SettingsModal />
      <EntrySettingsModal />
      <AddAudioModal isOpen={isAddAudioModalOpen} onClose={() => setIsAddAudioModalOpen(false)} />
      <WinnerModal />
      <ResultsModal />
      <ExportModal />
      {winner && showConfetti && winner.isEliminated !== true && <Confetti />}

      {/* Global CSS injected here to maintain original structure without moving to index.css if not needed */}
      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1a1b23; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d303e; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #474f6b; }`}} />
    </div>
  );
};
