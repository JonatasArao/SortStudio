import React from 'react';
import { HomePage } from './components/pages/HomePage';
import { useAppInitialization } from './hooks/useAppInitialization';

export default function App() {
  const { isLoaded } = useAppInitialization();

  if (!isLoaded) return null;

  return (
    <HomePage />
  );
}

