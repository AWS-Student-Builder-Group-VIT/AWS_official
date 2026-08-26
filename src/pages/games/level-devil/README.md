# AWS Level Devil

An independently runnable React 19 + Vite Canvas platformer. React owns the landing screen, HUD, result shell, and integration boundary; the supplied Canvas engine retains all 30 level definitions while official and Practice play expose only levels 1–5.

## Run locally

```powershell
cd "C:\Users\shubg\work\games\level-devil"
npm install
npm run dev
```

Use `npm test` for the scoring/state suite and `npm run build` for the production bundle.

## Controls and scoring

Arrow keys or `A`/`D` move; Up, `W`, or Space jumps; `R` restarts; `M` mutes; and `F` toggles fullscreen. Each official level has seven attempts. Attempts 1–3 earn 10 points, then attempts 4–7 earn 9, 8, 7, and 6 points. Practice has unlimited retries and cannot modify the official result.

## Integration

```jsx
import { LevelDevilGame } from './src/LevelDevilGame.jsx';

<LevelDevilGame onComplete={(result) => {}} onExit={() => {}} />
```

The component retains `aws-level-devil:v1`, dispatches `aws-level-devil:complete`, and calls `window.AWSLevelDevilOnComplete(result)` when defined. The bundled engine exposes a destroy hook that cancels its animation frame and resize listeners when React unmounts it.

The original MIT `LICENSE` and attribution remain included.
