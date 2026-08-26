import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WordleGame } from './WordleGame.jsx';

afterEach(() => { cleanup(); localStorage.clear(); });

test('renders the original standalone frontend and starts an official game', () => {
  render(<WordleGame />);
  expect(screen.getByText('Hackathon Protocol 01')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'AWS Builder Wordle' })).toBeTruthy();
  expect(screen.getByText('STUDENT BUILDER GROUP')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'START OFFICIAL ATTEMPT' }));
  expect(screen.getByRole('button', { name: 'ENTER' })).toBeTruthy();
  expect(document.querySelectorAll('.tile')).toHaveLength(30);
});
