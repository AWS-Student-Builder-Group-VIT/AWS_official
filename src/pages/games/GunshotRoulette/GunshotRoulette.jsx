import { useEffect, useRef } from 'react';
import { getGunshotCompletion } from '../../../utils/teamGameScoring';
import './gunshotRoulette.css';

// The original DOM game is mounted and cleaned up by this hook, just like the
// canvas engines used by the other game route components.
function useGunshotRoulette(rootRef, onComplete) {
  useEffect(() => {
    const rootElement = rootRef.current;
    let disposed = false;
    let script;
    let style;
    let completed = false;
    const completionHandler = (dealerEliminated, bankroll) => {
      if (completed || !onComplete) return;
      completed = true;
      void onComplete(getGunshotCompletion({ dealerEliminated, bankroll }));
    };
    window.__AWSGunshotReactOnComplete = completionHandler;
    fetch('/games/gunshot-roulette/game7.html')
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load Gunshot Roulette (${response.status})`);
        return response.text();
      })
      .then((source) => {
        if (disposed || !rootElement) return;
        const documentNode = new DOMParser().parseFromString(source, 'text/html');
        const legacyScript = documentNode.querySelector('script');
        const legacyStyle = documentNode.querySelector('style');

        // Mount the original markup before its stylesheet. Setting innerHTML after
        // appending the style used to delete the stylesheet and expand the SVGs.
        rootElement.innerHTML = documentNode.body.innerHTML.replace(legacyScript?.outerHTML || '', '');

        if (legacyStyle) {
          style = document.createElement('style');
          style.textContent = legacyStyle.textContent;
          rootElement.appendChild(style);
        }

        const startButton = rootElement.querySelector('#overlay .primary');
        startButton?.removeAttribute('onclick');

        script = document.createElement('script');
        const gameSource = (legacyScript?.textContent || '')
          .replaceAll("'rack.mp3'", "'/games/gunshot-roulette/rack.mp3'")
          .replaceAll("'gunshot.mp3'", "'/games/gunshot-roulette/gunshot.mp3'");

        // Keep the original game implementation intact while isolating its names
        // so a React Strict Mode remount cannot redeclare global const/let values.
        script.textContent = `(() => {\n${gameSource}\nconst startButton = document.querySelector('.aws-roulette-original #overlay .primary');\nif (startButton) startButton.onclick = closeModal;\nconst originalDealerDeath = handleDealerDeath;\nhandleDealerDeath = function () { originalDealerDeath(); window.__AWSGunshotReactOnComplete?.(true, state.points); };\nconst originalPlayerDeath = handlePlayerDeath;\nhandlePlayerDeath = function () { window.__AWSGunshotReactOnComplete?.(false, 0); originalPlayerDeath(); };\n})();`;
        rootElement.appendChild(script);
      })
      .catch((error) => {
        if (!disposed && rootElement) {
          rootElement.textContent = error.message;
        }
      });

    return () => {
      disposed = true;
      script?.remove();
      style?.remove();
      if (window.__AWSGunshotReactOnComplete === completionHandler) delete window.__AWSGunshotReactOnComplete;
      if (rootElement) rootElement.innerHTML = '';
    };
  }, [rootRef, onComplete]);
}

export default function GunshotRoulette({ onComplete }) {
  const rootRef = useRef(null);
  useGunshotRoulette(rootRef, onComplete);
  return <main ref={rootRef} className="aws-roulette-original" aria-label="Gunshot Roulette" />;
}
