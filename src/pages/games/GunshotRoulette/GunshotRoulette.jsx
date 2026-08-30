import { useEffect, useRef } from 'react';
import './gunshotRoulette.css';

// The original DOM game is mounted and cleaned up by this hook, just like the
// canvas engines used by the other game route components.
function useGunshotRoulette(rootRef) {
  useEffect(() => {
    let disposed = false;
    let script;
    let style;
    fetch('/games/gunshot-roulette/game7.html')
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load Gunshot Roulette (${response.status})`);
        return response.text();
      })
      .then((source) => {
        if (disposed || !rootRef.current) return;
        const documentNode = new DOMParser().parseFromString(source, 'text/html');
        const legacyScript = documentNode.querySelector('script');
        const legacyStyle = documentNode.querySelector('style');

        // Mount the original markup before its stylesheet. Setting innerHTML after
        // appending the style used to delete the stylesheet and expand the SVGs.
        rootRef.current.innerHTML = documentNode.body.innerHTML.replace(legacyScript?.outerHTML || '', '');

        if (legacyStyle) {
          style = document.createElement('style');
          style.textContent = legacyStyle.textContent;
          rootRef.current.appendChild(style);
        }

        const startButton = rootRef.current.querySelector('#overlay .primary');
        startButton?.removeAttribute('onclick');

        script = document.createElement('script');
        const gameSource = (legacyScript?.textContent || '')
          .replaceAll("'rack.mp3'", "'/games/gunshot-roulette/rack.mp3'")
          .replaceAll("'gunshot.mp3'", "'/games/gunshot-roulette/gunshot.mp3'");

        // Keep the original game implementation intact while isolating its names
        // so a React Strict Mode remount cannot redeclare global const/let values.
        script.textContent = `(() => {\n${gameSource}\nconst startButton = document.querySelector('.aws-roulette-original #overlay .primary');\nif (startButton) startButton.onclick = closeModal;\n})();`;
        rootRef.current.appendChild(script);
      })
      .catch((error) => {
        if (!disposed && rootRef.current) {
          rootRef.current.textContent = error.message;
        }
      });

    return () => {
      disposed = true;
      script?.remove();
      style?.remove();
      if (rootRef.current) rootRef.current.innerHTML = '';
    };
  }, [rootRef]);
}

export default function GunshotRoulette() {
  const rootRef = useRef(null);
  useGunshotRoulette(rootRef);
  return <main ref={rootRef} className="aws-roulette-original" aria-label="Gunshot Roulette" />;
}
