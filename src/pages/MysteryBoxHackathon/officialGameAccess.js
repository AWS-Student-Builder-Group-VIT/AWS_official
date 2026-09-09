export function getOfficialGameCardAccess({
  played,
  remainingAttempts,
  gamesEnabled,
  practicePath,
  officialPath,
}) {
  if (played) {
    return {
      mode: 'practice',
      disabled: false,
      label: 'Play Again — Practice',
      path: practicePath,
    };
  }

  if (Number(remainingAttempts) <= 0) {
    return {
      mode: 'practice',
      disabled: false,
      label: 'Play Practice — No Points',
      path: practicePath,
    };
  }

  if (!gamesEnabled) {
    return {
      mode: 'blocked',
      disabled: true,
      label: 'Unavailable',
      path: null,
    };
  }

  return {
    mode: 'official',
    disabled: false,
    label: 'Play Official Game',
    path: officialPath,
  };
}
