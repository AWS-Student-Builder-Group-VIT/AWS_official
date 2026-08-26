# AWS Builder Wordle

An independently runnable React 19 + Vite browser game using the AWS Cloud Club visual system.

## Run locally

```powershell
cd "C:\Users\shubg\work\games\ASCII-Wordle"
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm test` for the logic suite and `npm run build` for the production bundle.

## Integration

```jsx
import { WordleGame } from './src/WordleGame.jsx';

<WordleGame onComplete={(result) => {}} onExit={() => {}} />
```

The component retains `aws-builder-wordle:v1`, dispatches `aws-wordle:complete`, and calls `window.AWSWordleOnComplete(result)` when defined. Practice never changes or reports the official result.

The complete accepted-word data remains in `wordList.json` and is bundled by Vite. Core rules and persistence helpers live in `src/wordleCore.js`; the component and scoped styles live in `src/WordleGame.jsx` and `src/wordle.css`.
