import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
export const formatDateTime = (date) => format(new Date(date), 'MMM d, yyyy h:mm a');
export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const scoreColor = (score, max) => {
  const pct = score / max;
  if (pct >= 0.7) return 'text-success';
  if (pct >= 0.4) return 'text-warning';
  return 'text-error';
};

export const statusLabel = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  qualified: 'Qualified',
  not_qualified: 'Not Qualified',
  pending: 'Pending',
  round_0: 'Round 1 · Assessment',
  round_1: 'Round 2 · Project',
  round_2: 'Round 3 · Interview',
  selected: 'Selected',
  waitlisted: 'Waitlisted',
  rejected: 'Not Selected',
  not_selected: 'Not Selected',
};

export const statusColor = {
  not_started: 'text-dim',
  in_progress: 'text-info',
  submitted: 'text-warning',
  under_review: 'text-warning',
  qualified: 'text-success',
  not_qualified: 'text-error',
  selected: 'text-success',
  waitlisted: 'text-warning',
  rejected: 'text-error',
  not_selected: 'text-error',
};
