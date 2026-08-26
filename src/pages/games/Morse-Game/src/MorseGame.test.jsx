import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MorseGame } from './MorseGame.jsx';

afterEach(() => { cleanup(); localStorage.clear(); });

test('starts a five-signal attempt and opens the reference chart', () => {
  render(<MorseGame />);
  fireEvent.click(screen.getByRole('button', { name: 'START OFFICIAL ATTEMPT' }));
  expect(screen.getByText(/OFFICIAL · 1\/5/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'REFERENCE (2)' }));
  expect(screen.getByRole('heading', { name: 'INTERNATIONAL MORSE' })).toBeTruthy();
});
