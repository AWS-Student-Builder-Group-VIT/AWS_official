# AWS Morse Decoder

An independently runnable React 19 + Vite Morse-decoding game. It is a clean-room implementation inspired by [evontay/morse-game](https://github.com/evontay/morse-game) and does not copy its source or assets.

## Run locally

```powershell
cd "C:\Users\shubg\work\games\Morse-Game"
npm install
npm run dev
```

Use `npm test` for the logic suite and `npm run build` for the production bundle.

## Rules

The run contains five signals: two random letters, `AWS`, then easy and hard randomized words. Each signal has an absolute 15-second deadline and two reference-chart opens. Correct answers earn 7–10 points. A completed official attempt is locked; Practice retries never overwrite it.

## Integration

```jsx
import { MorseGame } from './src/MorseGame.jsx';

<MorseGame onComplete={(result) => {}} onExit={() => {}} />
```

The component retains `aws-morse:v1`, dispatches `aws-morse:complete`, and calls `window.AWSMorseOnComplete(result)` when defined. Core encoding, scoring, randomized questions, persistence, and payload construction live in `src/morseCore.js`.
