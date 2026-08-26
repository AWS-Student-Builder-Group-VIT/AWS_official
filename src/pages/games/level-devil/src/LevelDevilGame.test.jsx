import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LevelDevilGame } from './LevelDevilGame.jsx';

afterEach(() => { cleanup(); delete window.AWSLevelDevilDestroy; });

test('renders the five-level shell and destroys the engine on unmount', () => {
  window.AWSLevelDevilDestroy = vi.fn();
  const view = render(<LevelDevilGame />);
  expect(screen.getByRole('button', { name: 'START OFFICIAL RUN' })).toBeTruthy();
  expect(screen.getByText(/Five levels\. Seven attempts each\./)).toBeTruthy();
  view.unmount();
  expect(window.AWSLevelDevilDestroy).toHaveBeenCalledOnce();
});
