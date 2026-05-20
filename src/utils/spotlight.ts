// spotlight.ts - Cursor-following spotlight hover tracker helper for React components
import React from 'react';

export const handleSpotlightMouseMove = (e: React.MouseEvent<HTMLElement>) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};
