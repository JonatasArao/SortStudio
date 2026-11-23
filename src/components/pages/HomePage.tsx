import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { applyThemeToDocument } from '../../constants/themes';
import { Header } from '../organisms/Header';
import { EliminationHUD } from '../organisms/EliminationHUD';
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
import { TestDisplay } from '../organisms/TestDisplay';
import { useGameLoop } from '../../hooks/useGameLoop';
import { EliminationFeed } from '../organisms/EliminationFeed';
import { GraveyardModal } from '../organisms/GraveyardModal';
import { EliminationPopup } from '../organisms/EliminationPopup';

export const HomePage = () => {
  const winner = useAppStore(s => s.winner);
  const showConfetti = useAppStore(s => s.showConfetti);
  const isAddAudioModalOpen = useAppStore(s => s.isAddAudioModalOpen);
  const setIsAddAudioModalOpen = useAppStore(s => s.setIsAddAudioModalOpen);
  const wheelType = useAppStore(s => s.wheelType);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const uiDensity = useAppStore(s => s.uiDensity);

  useEffect(() => {
    applyThemeToDocument(wheelTheme);
  }, [wheelTheme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.density = uiDensity;
    }
  }, [uiDensity]);

  useGameLoop();

  return (
    <div
      data-density={uiDensity}
      className="h-[100dvh] w-full bg-[var(--studio-canvas)] text-[var(--studio-text)] flex flex-col overflow-hidden transition-colors duration-300"
    >
      <Header />
      <EliminationHUD />
      <main className="flex flex-1 flex-row overflow-hidden min-h-0 relative">
        {wheelType === 'horizon' ? (
          <HorizonDisplay />
        ) : wheelType === 'mystery_box' ? (
          <MysteryBoxDisplay />
        ) : wheelType === 'race' ? (
          <RaceDisplay />
        ) : wheelType === 'penalty_shootout' ? (
          <PenaltyShootoutDisplay />
        ) : wheelType === 'bingo' ? (
          <BingoDisplay />
        ) : wheelType === 'test' ? (
          <TestDisplay />
        ) : (
          <WheelDisplay />
        )}
        <Sidebar />
        <EliminationFeed />
      </main>

      <SettingsModal />
      <EntrySettingsModal />
      <AddAudioModal isOpen={isAddAudioModalOpen} onClose={() => setIsAddAudioModalOpen(false)} />
      <WinnerModal />
      <ResultsModal />
      <ExportModal />
      <GraveyardModal />
      <EliminationPopup />
      {winner && showConfetti && winner.isEliminated !== true && <Confetti />}
    </div>
  );
};
