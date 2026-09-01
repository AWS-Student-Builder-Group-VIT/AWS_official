import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import OfficialGameReceipt from '../../../../components/OfficialGameReceipt.jsx';

afterEach(cleanup);

describe('official game score receipt', () => {
  it('shows confirmed points, balance, usage, and both navigation actions', () => {
    const onDashboard = vi.fn();
    const onPractice = vi.fn();
    render(<OfficialGameReceipt
      gameTitle="AWS Builder Wordle"
      receipt={{ confirmed: true, points: 20, balance: 160, usedAttempts: 2, remainingAttempts: 3 }}
      onDashboard={onDashboard}
      onPractice={onPractice}
    />);
    expect(screen.getByText('+20')).toBeTruthy();
    expect(screen.getByText('160 pts')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onDashboard).toHaveBeenCalledOnce();
    expect(onPractice).toHaveBeenCalledOnce();
  });

  it('offers retry but withholds Practice while submission is queued', () => {
    const onRetry = vi.fn();
    render(<OfficialGameReceipt
      gameTitle="AWS Morse Decoder"
      receipt={{ confirmed: false, queued: true, error: 'offline' }}
      onRetry={onRetry}
      onDashboard={() => {}}
      onPractice={() => {}}
    />);
    expect(screen.queryByRole('button', { name: /play again/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry submission/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders a submission lock before confirmation', () => {
    render(<OfficialGameReceipt gameTitle="Pacman" submitting onDashboard={() => {}} onPractice={() => {}} />);
    expect(screen.getByText(/submitting score to neon/i)).toBeTruthy();
  });
});
