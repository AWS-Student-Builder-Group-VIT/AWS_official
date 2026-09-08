export function startGameScorePolling({
  loadScores,
  onSuccess,
  intervalMs = 3000,
  windowTarget = window,
  documentTarget = document,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let active = true;
  let inFlight = null;

  const refresh = () => {
    if (!active) return Promise.resolve();
    if (inFlight) return inFlight;

    inFlight = Promise.resolve()
      .then(loadScores)
      .then((response) => {
        if (active && response?.ok) onSuccess(response);
      })
      .catch(() => {})
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  const refreshWhenVisible = () => {
    if (documentTarget.visibilityState === 'visible') void refresh();
  };
  const refreshNow = () => { void refresh(); };

  windowTarget.addEventListener('focus', refreshNow);
  windowTarget.addEventListener('aws-team-score:updated', refreshNow);
  documentTarget.addEventListener('visibilitychange', refreshWhenVisible);

  void refresh();
  const intervalId = setIntervalFn(refreshNow, intervalMs);

  return () => {
    active = false;
    clearIntervalFn(intervalId);
    windowTarget.removeEventListener('focus', refreshNow);
    windowTarget.removeEventListener('aws-team-score:updated', refreshNow);
    documentTarget.removeEventListener('visibilitychange', refreshWhenVisible);
  };
}
