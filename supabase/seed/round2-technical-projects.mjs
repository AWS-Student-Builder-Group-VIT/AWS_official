/**
 * Round 2 technical project pool, from Technical_Assessments_Combined.pdf.
 *
 * Each candidate qualified for a Technical track is randomly assigned one active
 * project from that track's pool. Candidate-facing text lives in
 * problem_statement / requirements / optional_features. Judging criteria and
 * interviewer notes live only in evaluation_rubric, which is never sent to
 * candidates.
 *
 * Run from the repository root:  node supabase/seed/round2-technical-projects.mjs
 * Safe to re-run: projects are upserted by code, and the old sample projects
 * for these tracks are switched off rather than deleted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const AIML_SUBMISSION = 'Public GitHub repository with a clear README.md detailing setup, dependency installation, how to reproduce results, and instructions for re-running evaluation. Include a short write-up (1-2 pages or notebook) covering approach, key decisions, and results.';

const section = (heading, lines) => `${heading}\n${lines.map((line) => `• ${line}`).join('\n')}`;

export const projects = [
  // ── AI / Machine Learning ────────────────────────────────────────────────
  {
    code: 'AIML-01', track: 'ai_ml', active: true,
    title: 'Hybrid Recommendation Engine with Cold-Start Handling',
    problem_statement: [
      'Scenario',
      'A streaming platform wants to recommend content to users, but new users and new items have no interaction history — a naive collaborative filter fails for both.',
      '',
      'Objective',
      'Build a hybrid recommender that blends collaborative filtering with content-based features so it degrades gracefully for cold-start cases instead of breaking.',
      '',
      'Dataset',
      'MovieLens 25M (or 1M for faster iteration), Kaggle/GroupLens',
    ].join('\n'),
    requirements: [
      section('Requirements', [
        'Build a collaborative filtering model (matrix factorization — e.g. SVD or ALS) as the base',
        'Build a content-based component using item metadata (genre, tags, description embeddings) for items/users with sparse history',
        'Implement a blending strategy that shifts weight toward content-based scores as interaction history thins out — not a fixed 50/50 mix',
        'Evaluate using ranking metrics (Precision@K, Recall@K, NDCG) — not just RMSE on ratings',
        'Explicitly construct and test a cold-start slice (users/items with <5 interactions) and report metrics separately for it vs. warm users',
        'Analyze failure cases: where does the hybrid still recommend poorly, and why',
      ]),
      `Submission\n${AIML_SUBMISSION}`,
    ].join('\n\n'),
    optional_features: 'Add a re-ranking step for diversity/novelty (avoid recommending only popular items), or compare against a pure popularity baseline to quantify the lift.',
    rubric: [
      "Correctness of the collaborative filtering base model and whether it's meaningfully evaluated (not just fit-and-forget)",
      'Whether the content-based blend is adaptive (weighted by data sparsity) rather than a fixed/arbitrary mix',
      'Use of ranking metrics (Precision@K, Recall@K, NDCG) over RMSE alone, and correct interpretation of results',
      'Whether cold-start performance is isolated and reported separately from warm-user performance, with honest discussion of the gap',
      'Depth of failure analysis — specific, evidenced explanations rather than generic statements',
      'Code quality, reproducibility, and clarity of the write-up',
    ],
  },
  {
    code: 'AIML-02', track: 'ai_ml', active: true,
    title: 'Fraud/Anomaly Detection with Drift Monitoring',
    problem_statement: [
      'Scenario',
      "A fintech company's transaction patterns shift over time (new fraud tactics, seasonal spending) — a model trained once and left alone quietly degrades.",
      '',
      'Objective',
      'Build an anomaly detection system that flags suspicious transactions and detects when its own performance is drifting, not just a static classifier.',
      '',
      'Dataset',
      'Credit Card Fraud Detection, Kaggle (or IEEE-CIS Fraud Detection for more features)',
    ].join('\n'),
    requirements: [
      section('Requirements', [
        'Handle extreme class imbalance properly (not naive oversampling alone — justify the choice: SMOTE, class weighting, anomaly-based framing, etc.)',
        'Train both a supervised model (given labels exist) and an unsupervised anomaly detector (Isolation Forest/Autoencoder), and compare them',
        'Evaluate with Precision-Recall AUC (not ROC-AUC alone — explain why, given the imbalance)',
        'Implement a basic drift detection check (e.g. compare feature distributions or model confidence between a "training window" and a simulated "later window" of data)',
        'Set an alerting threshold logic: when drift crosses some bound, flag for retraining',
        "Analyze false positives' cost (blocked legitimate transactions) vs false negatives' cost (missed fraud) and justify a threshold choice",
      ]),
      `Submission\n${AIML_SUBMISSION}`,
    ].join('\n\n'),
    optional_features: 'Simulate concept drift artificially (inject a shifted data slice) and show your monitoring catches it; or implement a simple online-learning/incremental retrain loop.',
    rubric: [
      'Justification for the imbalance-handling technique chosen, not just applying SMOTE by default',
      'Whether both supervised and unsupervised approaches are implemented and fairly compared',
      'Correct choice and interpretation of Precision-Recall AUC over ROC-AUC, with reasoning tied to the imbalance',
      'Soundness of the drift detection logic and whether the simulated drift is actually caught',
      'Whether the false-positive/false-negative cost tradeoff is quantified and used to justify a concrete threshold',
      'Code quality, reproducibility, and clarity of the write-up',
    ],
  },
  {
    code: 'AIML-03', track: 'ai_ml', active: true,
    title: 'Multi-Object Tracking Under Occlusion',
    problem_statement: [
      'Scenario',
      'A retail store wants to count and track customers moving through the store using ceiling cameras, but customers constantly cross paths and occlude each other, breaking naive frame-by-frame detection.',
      '',
      'Objective',
      'Build a tracking pipeline that detects people per frame and maintains consistent identities across frames, even through brief occlusion.',
      '',
      'Dataset',
      'MOT17 or MOT20 (Multiple Object Tracking Benchmark)',
    ].join('\n'),
    requirements: [
      section('Requirements', [
        "Use a pretrained detector (YOLO, Faster R-CNN, etc.) for per-frame detection — don't train a detector from scratch",
        'Implement a tracking algorithm that associates detections across frames (e.g. SORT or DeepSORT — Kalman filter + Hungarian algorithm for ID assignment)',
        'Handle track loss gracefully: when a person is briefly occluded, re-associate them to the same ID on reappearance rather than spawning a new one',
        'Evaluate using tracking-specific metrics (MOTA, ID switches) — not just detection accuracy',
        'Analyze failure cases: where do ID switches happen, and is it occlusion, fast motion, or similar-looking people',
        'Visualize tracked trajectories over a sample clip',
      ]),
      `Submission\n${AIML_SUBMISSION}`,
    ].join('\n\n'),
    optional_features: 'Compare a motion-only tracker (SORT) against one that also uses appearance embeddings (DeepSORT) and quantify the difference in ID switches.',
    rubric: [
      'Correct integration of a pretrained detector with a tracking algorithm (not detection-only)',
      'Whether identity is preserved through occlusion, evaluated concretely rather than asserted',
      'Use of tracking-specific metrics (MOTA, ID switches) rather than detection accuracy alone',
      'Depth of failure-case analysis — distinguishing occlusion, fast motion, and appearance-similarity causes',
      'Quality of trajectory visualizations and whether they support the stated conclusions',
      'Code quality, reproducibility, and clarity of the write-up',
    ],
  },
  {
    code: 'AIML-04', track: 'ai_ml', active: true,
    title: 'Demand Forecasting with Uncertainty Quantification',
    problem_statement: [
      'Scenario',
      "A retailer needs to forecast product demand to plan inventory — but a single point forecast hides risk. Overstocking and stockouts cost differently, so the business needs a sense of the forecast's confidence, not just its center.",
      '',
      'Objective',
      'Build a forecasting model that outputs prediction intervals, not just point estimates, and use them to inform an inventory decision.',
      '',
      'Dataset',
      'M5 Forecasting (Walmart), Kaggle — or Store Item Demand Forecasting Challenge for a lighter version',
    ].join('\n'),
    requirements: [
      section('Requirements', [
        'Engineer time-based features (lags, rolling stats, seasonality, holidays/promotions)',
        'Train a forecasting model (gradient boosting with quantile loss, or a probabilistic model like Prophet with uncertainty intervals)',
        'Produce calibrated prediction intervals (e.g. 10th/50th/90th percentile), not just a mean forecast',
        'Evaluate both point accuracy (MAE/RMSE) and interval calibration (what fraction of actuals actually fall inside the predicted interval — it should match the nominal coverage)',
        'Translate the interval into a decision: e.g. set safety stock using the upper quantile, and show the cost tradeoff vs. using only the point forecast',
        'Analyze where the model is overconfident (intervals too narrow) — usually around demand spikes or promotions',
      ]),
      `Submission\n${AIML_SUBMISSION}`,
    ].join('\n\n'),
    optional_features: 'Compare quantile regression against a simpler approach (residual-based intervals from a point-forecast model) and show whether calibration actually improves.',
    rubric: [
      'Soundness of time-based feature engineering (no leakage of future information into lag/rolling features)',
      'Whether prediction intervals are actually produced and not just a point forecast with a label change',
      'Correct calibration check — reported coverage matches (or is honestly compared against) the nominal interval',
      'Whether the interval is translated into a concrete inventory decision with a stated cost tradeoff',
      'Honest identification of where/why the model is overconfident, backed by evidence',
      'Code quality, reproducibility, and clarity of the write-up',
    ],
  },

  // ── Web Development ──────────────────────────────────────────────────────
  {
    code: 'WEB-01', track: 'web', active: true,
    title: 'VIT Campus Lost & Found Recovery Portal',
    problem_statement: 'Design and build a full-stack recovery platform specifically tailored for the VIT campus community to replace messy WhatsApp groups. The platform must allow students to report missing or recovered items across campus venues, verify legitimate ownership through a private claim-check process, and coordinate secure on-campus returns without publicly exposing student mobile numbers.',
    requirements: [
      section('Features required', [
        "VIT Campus Venues & Category Tagging: Separate feeds for \"Lost\" and \"Found\". Location tagging restricted to official VIT campus landmarks: Academic Blocks (SJT, TT, PRP, SMV, MB, GDN, CDMM), Men's Hostel Blocks (MH-A through MH-T), Ladies' Hostel Blocks (LH-A through LH-J), Food Courts (Gazebo, Food Mall, DC), Central Library, and Sports Complex. Category tags: ID Cards, Room Keys, Calculators, Lab Equipment, Earphones, Wallets.",
        "Student Authentication & Privacy: Public listings must mask the finder's personal registration number, email, and phone number to prevent spam and unsolicited contact.",
        "Ownership Verification Workflow: A student claiming an item cannot view the finder's identity. Claimants must submit a \"Claim Verification Request\" answering a custom verification challenge set by the finder (e.g., \"What name/branch is on the ID tag?\"). The finder evaluates claims in a private dashboard to \"Approve\" or \"Reject\".",
        'Safe In-App Handoff Coordination: Approved claims generate an in-app private communication thread or coordinate relay to agree on a physical campus meetup checkpoint (e.g., SJT Ground Floor Reception or Central Library Security Desk).',
        'Lifecycle Management: Returned items can be marked as "Resolved" by either party, automatically removing them from active campus boards.',
      ]),
      'Submission\nPublic GitHub repository with a clear README.md detailing local setup, database bootstrap scripts, and execution instructions. Implement robust input validation, clear error messages, and UI visual feedback for loading, empty, and submitted states.',
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'WEB-02', track: 'web', active: true,
    title: 'Live Collaborative Workspace and Code Pad',
    problem_statement: 'Build a multi-user real-time web workspace where students can join persistent virtual rooms, collaborate on code or technical notes simultaneously, and track participant presence without data collisions or UI freezing.',
    requirements: [
      section('Features required', [
        'Synchronized Editor Interface: Split layout featuring a synchronized code/text editor, an active room participant list, and a live activity audit feed.',
        'Room Management & Security: Custom room IDs with optional passcodes. Credentials must be validated prior to admitting a client into an active room session.',
        'Real-Time Broadcast Protocol: Synchronize character insertions, deletions, cursor positions, and line highlights across all active peers. Real-time indicator badges displaying typing/presence status.',
        'Connection & Spam Throttling: Throttle broadcast traffic from any individual connection emitting rapid update bursts (e.g., >5 updates/second) to prevent socket flooding.',
        'Dynamic Role Reassignment: The room creator serves as host. If the host disconnects, administrative privileges transfer automatically to the oldest active remaining member.',
      ]),
      'Submission\nPublic GitHub repository with a detailed README.md covering environment configuration, dependency installation, and local execution steps. Ensure graceful handling of abrupt socket disconnections and smooth reconnect behavior.',
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'WEB-03', track: 'web', active: true,
    title: 'Campus Placement & Internship Portal (Three-Tier Multi-Page System)',
    problem_statement: 'Develop a role-based recruitment platform modeling an institutional campus placement portal. The platform must implement distinct interfaces and permission boundaries for Student Applicants, Company Recruiters, and Placement Cell Administrators.',
    requirements: [
      [
        'Features required',
        '• Three Distinct Role Workflows:',
        '   – Student Applicant: Browses approved company openings, manages a student profile (branch, CGPA, graduation year, resume link), submits job applications, and tracks progress.',
        '   – Company Recruiter: Creates company profiles, publishes job postings with eligibility criteria (minimum CGPA, allowed departments), reviews candidate profiles, and updates hiring status.',
        '   – Placement Cell Admin: Dedicated portal where newly registered companies and job postings must be approved or rejected before becoming visible to students.',
        '• Server-Side Eligibility Gating: The backend must evaluate applicant profiles against posting eligibility criteria (e.g., CGPA thresholds). Ineligible candidates are blocked from submission with a clear explanatory notice.',
        '• Application Tracking Pipeline: Multi-page candidate view allowing students to monitor application status in real time. Recruiter interface supporting single and batch applicant status transitions.',
        '• Administrative Action Logs: Audit records of admin approvals/rejections with timestamps and reviewer IDs.',
      ].join('\n'),
      'Submission\nPublic GitHub repository with a README.md containing local setup instructions, mock login credentials for each user role (Student, Recruiter, Admin), and sample database population commands.',
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'WEB-04', track: 'web', active: true,
    title: 'Event Ticketing System with Automated Mailer and QR Entry Check-In',
    problem_statement: 'Build a multi-page event ticketing and check-in system for campus events. Students register for an event, receive an automated confirmation email containing a cryptographically signed QR ticket, and event organizers scan the QR code using a dedicated portal to verify check-in in real time.',
    requirements: [
      section('Features required', [
        'Participant Registration Portal: Event browsing interface with capacity limits (rejecting submissions once maximum venue capacity is reached).',
        "Transactional Email Dispatch Engine: Generates and dispatches a dynamic HTML email to the participant's inbox using a real email service provider (e.g., Resend, SendGrid, Brevo, or Nodemailer with SMTP) with an embedded unique QR code representing a cryptographically signed ticket token.",
        'Organizer Scan & Verification Portal: Dedicated organizer interface featuring an integrated webcam QR scanner (with a manual token input fallback for testing) that issues instant backend verification requests.',
        'Check-In & Anti-Duplication Security: Validates attendee against database. First valid scan marks attendee as "CHECKED-IN". Subsequent scans flag the ticket as "ALREADY USED" with original check-in timestamp. Counterfeit/malformed QR codes trigger an "INVALID TICKET" alert.',
      ]),
      'Submission\nPublic GitHub repository with a README.md detailing environment variables (including third-party mailer credentials), local execution steps, and instructions on how to test the organizer scan workflow locally.',
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'WEB-BE1', track: 'web', active: true,
    title: 'Multi-Resource API with Roles & Concurrency Safety',
    problem_statement: 'Build an API around at least two related resources with a real relationship (e.g. Users↔Events via Registrations, or Users↔Projects via Tasks), with role-based access and safe handling of concurrent writes.',
    requirements: section('Requirements', [
      'At least 2 related resources with a real relationship in the schema (foreign keys / join table) — not flattened into one table',
      'Role-based access control: at least 2 roles (e.g. admin/member) where specific endpoints are restricted by role, not just by "logged in or not"',
      'Auth using short-lived access tokens + a refresh token flow — not one long-lived JWT that never expires',
      "One concurrency-sensitive operation handled correctly — e.g. a capacity-limited event registration where two simultaneous requests can't both succeed past the cap. Must use DB transactions/row-level locking, not an app-level \"check-then-write\" if-statement (which races)",
      'Pagination, filtering, or sorting on at least one list endpoint',
      '3–5 automated tests (unit or integration) covering real logic — not just "endpoint returns 200"',
    ]),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'WEB-BE2', track: 'web', active: true,
    title: 'Real-Time Bidding / Collaboration Backend',
    problem_statement: 'Build a backend for a live, multi-client system — a simple auction (multiple bidders on an item) or a collaborative task board — using WebSockets (or SSE) for real-time updates, correct under concurrent actions.',
    requirements: section('Requirements', [
      'A WebSocket or SSE layer that pushes live updates to connected clients when state changes',
      'A race-condition-sensitive action (e.g. near-simultaneous bids) resolved correctly and consistently (highest bid wins, stale/lower bids rejected) using real locking/transactions — not "last write wins"',
      'Persisted state so a reconnecting client or a fresh page load sees the current, correct state — not just whatever happens to be in memory',
      'Correct handling of disconnects/reconnects without corrupting shared state',
    ]),
    optional_features: null,
    rubric: [],
  },
  {
    // Loaded but switched off: outside the chosen six-task Web Dev pool.
    code: 'WEB-FLASH', track: 'web', active: false,
    title: 'High-Traffic Flash Event Registration System',
    problem_statement: [
      'The "Flash Event" project is a web application designed to handle massive, concurrent registration spikes for limited-capacity campus workshops. Unlike standard CRUD apps, this project tests your ability to build systems that survive aggressive campus traffic.',
      '',
      'The challenge: the backend must handle severe race conditions, implement strict rate limiting, manage a dynamic waitlist queue, and maintain performance when hundreds of students attempt to grab the final available seat at the exact same millisecond. A simple UI is acceptable, but the API and database flow must be enterprise-grade.',
    ].join('\n'),
    requirements: [
      section('1. Identity & Permissions', ['JWT or secure session-based authentication.', 'Strict RBAC (Role-Based Access Control) for Students vs. Admins.', 'Protection against mass assignment and IDOR vulnerabilities.']),
      section('2. Real-Time Browsing', ['Public feed of upcoming events and capacities.', 'Highly performant read operations (simulating heavy refresh traffic).', 'Filter and search capabilities.']),
      section('3. Transactional Registration', ['Atomic registration for open events.', 'Automated, fair waitlist queuing system.', 'Idempotent endpoints to prevent duplicate campus Wi-Fi requests.']),
      section('4. Administrative Controls', ['Create/edit event metadata and capacity bounds.', 'View real-time registration queues.', 'Manual moderation of attendee lists.']),
      section('Business rules', [
        'Absolute Capacity Enforcement (No Overbooking): an event with 100 seats must strictly block the 101st request, even if 500 requests hit the database simultaneously. Race conditions must be mitigated at the database/transaction level.',
        'Stateless Backend Architecture: the server must be capable of horizontal scaling. Session state should not be stored in local server memory; use JWTs or a centralized store (like Redis) if sessions are required.',
        'Rate Limiting & Abuse Prevention: the registration endpoint must prevent brute-force attacks from scripted bot requests (e.g., limiting a single user/IP to X attempts per minute).',
        'Automated Waitlist Processing: when a confirmed user cancels, the system must deterministically promote the next user in the queue without requiring manual admin intervention.',
      ]),
    ].join('\n\n'),
    optional_features: null,
    rubric: [
      'Build (Implementation): Does the application actually work? Did they successfully integrate the frontend, backend APIs, and database? Is the code structured reasonably well?',
      'Break (Edge Cases): What happens under stress? Bypass their UI and hit their APIs with Postman. Send negative values, modify JWT payloads, and simulate duplicate clicks.',
      'Explain (Comprehension): Can they explain their schema constraints? Why did they choose a specific ORM or library? Can they trace a request from the browser down to the database row?',
      'Adapt (Agility): Introduce a new theoretical requirement (e.g., "Implement a VIP priority queue"). Can they identify exactly which controllers and tables need to change?',
    ],
  },

  // ── Game Development ─────────────────────────────────────────────────────
  {
    code: 'GAME-01', track: 'game', active: true,
    title: 'Build a 2D Fruit Merge Game',
    problem_statement: 'Design and implement a basic 2D Fruit Merge (Suika Game clone) inside a single HTML file using pure JavaScript and the HTML5 Canvas API. This task evaluates your understanding of circle-to-circle physics, impulse/overlap resolution, state updating, and array manipulation.',
    requirements: [
      section('Core requirements & gameplay rules', [
        "Fruit Spawning: Clicking on the canvas drops a new fruit from the mouse's horizontal (X) position at the top boundary. Each spawned fruit should randomly pick from the lowest entry-level fruit types.",
        'Circle Physics & Boundaries: Implement gravity pulling fruits downward. Fruits must collide and bounce off the left, right, and bottom edges of the canvas without clipping outside.',
        'Fruit Collision Handling: Implement explicit circle-to-circle collision detection and position resolution so fruits rest against each other naturally without overlapping or phasing through.',
        'Fruit Merging Mechanics: When two fruits of the same level/type collide, remove both fruits and instantiate a single, larger fruit of the next level at their collision midpoint (e.g. two Level 1 fruits merge into one Level 2 fruit).',
        'Progressive Sizes: Each successive fruit level must have a noticeably larger collision radius than the previous level.',
        'Scoring & UI: Award points whenever two fruits merge (larger merges yield higher points). Display the live score prominently on screen.',
        'Game Loop & Controls: Run updates and rendering cleanly via requestAnimationFrame(). Include a restart button to clear the board and reset score.',
      ]),
      section('Technical constraints', [
        'Single File Structure: Everything (HTML layout, CSS styling, and JavaScript logic) must exist inside one standard .html file.',
        'Visual Representation: You can use primitive colored circles with text/emojis drawn inside them or distinct solid colors to represent different fruit tiers.',
      ]),
      section('What NOT to use', [
        'Do NOT use Physics Engines: Do NOT use Matter.js, Box2D, Phaser, or any external physics/game engines. Calculate gravitational acceleration, velocity updates and circle overlap resolution manually.',
        'Do NOT use External Frameworks or Assets: Use only standard HTML, CSS, JavaScript, and native Canvas API functions. No external libraries, web fonts, or sprite sheets.',
      ]),
    ].join('\n\n'),
    optional_features: [
      '• Game-Over Line: Trigger a game-over state if any fruit remains settled above a designated top ceiling line for more than 2 seconds.',
      '• Merge Effects: Draw a brief visual pop/particle effect or scaling animation at the coordinates where a merge occurs.',
      '• Fruit Limit & Optimization: Enforce a maximum fruit threshold on screen to maintain a smooth 60 FPS update loop.',
    ].join('\n'),
    rubric: [],
  },
  {
    code: 'GAME-02', track: 'game', active: true,
    title: 'Build a 2D Flappy Bird Game',
    problem_statement: 'Design and implement a basic 2D Flappy Bird clone to demonstrate your understanding of fundamental game development concepts, including collision detection, basic physics, state management, and user input.',
    requirements: [
      section('Core requirements & gameplay rules', [
        'Player Physics: Create a bird sprite that falls automatically due to gravity. Pressing a designated key (e.g., Spacebar or Mouse Click) must apply an upward force (jump/flap).',
        'Obstacles & Movement: Generate vertical pipe pairs with a playable gap in between. Pipes must spawn at regular intervals on the right side of the screen, move continuously to the left, and disappear when off-screen.',
        'Collision Detection: End the game immediately if the bird touches any pipe, the ground, or moves beyond the top ceiling boundary.',
        'Scoring System: Increase the player\'s score by +1 every time the bird successfully passes between a pair of pipes.',
        'Game States: Implement three clear game states — 1) Start Screen (displays instructions to press a key to start), 2) Gameplay (active movement and scoring), 3) Game Over Screen (displays final score with a prompt to restart).',
      ]),
      section('Technical constraints', [
        'Language & Framework: Use any entry-level engine or framework you prefer (e.g., Python with Pygame, JavaScript with HTML5 Canvas, or C++ with SFML/Raylib).',
        'Focus on Logic First: Visual aesthetics do not affect your grade. Simple geometric shapes (e.g., a square/circle for the bird, rectangles for pipes) are fully acceptable if you do not want to load image assets.',
      ]),
      section('What NOT to use', [
        'Do NOT use built-in Physics Engines: Avoid complex physics engines (like Box2D, Arcade Physics, or Matter.js). Calculate velocity, gravity, and position directly using simple kinematic variables (e.g., y_pos += velocity, velocity += gravity).',
        'Do NOT use Tilemaps or Scene Editors: Build your layout programmatically rather than using graphical map editors.',
      ]),
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'GAME-03', track: 'game', active: true,
    title: 'Build a Grid-Based Connect Four Game',
    problem_statement: 'Design and implement a functional, two-player Connect Four game operating on a standard grid (6 rows × 7 columns). This task evaluates your understanding of 2D matrix manipulation, turn-based state management, column placement logic, and multi-directional search algorithms.',
    requirements: [
      section('Core requirements & gameplay rules', [
        'Turn-Based System: Alternate turns between Player 1 (Red) and Player 2 (Yellow). Clearly display whose turn it currently is above or next to the board.',
        'Disc Drop Mechanics: Players select a target column (0 through 6) via mouse click or keyboard input (1-7). The disc must automatically drop to the lowest available unoccupied row in that specific column. If a column is already full (6 discs), ignore the input.',
        'Win Detection Algorithm: Automatically evaluate the board after every move to check if the current player has aligned 4 consecutive discs — horizontally, vertically, diagonally ascending (bottom-left to top-right), and diagonally descending (top-left to bottom-right).',
        'Game Over & Reset States: If a player connects 4 discs, freeze input, declare the winner (e.g., "Player 1 Wins!"), and provide a prompt to restart the game. If all 42 cells fill up with no winner, declare a Draw and prompt to restart.',
      ]),
      section('Technical constraints', [
        'Focus on Code Structure: Visual aesthetics do not impact evaluation. Primitive colored circles placed inside gray grid squares are completely sufficient.',
        'Direct Input Handling: Accept input by clicking on columns directly or pressing numbers 1 through 7.',
      ]),
      section('What NOT to use', [
        'Do NOT use Physics Engines: Do NOT use rigidbodies or physics gravity to drop discs. Calculate row placement strictly using 2D matrix checks (e.g., scanning the selected column from bottom to top for the first empty index).',
      ]),
    ].join('\n\n'),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'GAME-04', track: 'game', active: true,
    title: 'Build a 2D Single-Player Pong Game',
    problem_statement: 'Design and implement a classic 2D single-player Pong game inside a single HTML file using pure JavaScript and the HTML5 Canvas API. This task evaluates your understanding of basic kinematic physics, vector reflection, automated AI movement, paddle clamping, and continuous input handling.',
    requirements: [
      section('Core requirements & gameplay rules', [
        'Player Paddle Controls: Allow the human player to control a vertical paddle moving up and down using designated keyboard keys (e.g., W / S or Up / Down Arrow keys). Clamp paddle movement so it cannot exit the top or bottom screen boundaries.',
        'Ball Movement & Wall Physics: Move a ball continuously across the screen using horizontal and vertical velocity increments (dx, dy). The ball must bounce accurately off the top and bottom walls (dy = -dy).',
        'Paddle Collision Detection: Implement rectangle-to-circle collision detection so the ball bounces off the front face of both paddles.',
        "AI Opponent: Create an automated computer paddle on the opposite side that tracks the ball's vertical (Y) position. Add a simple speed threshold or delay so the AI moves at a playable pace and can be outmanoeuvred by the player.",
        "Scoring & Ball Reset: Display a live score for both the Player and AI. When the ball passes a paddle's goal line, award +1 point to the opponent and reset the ball to the centre of the screen traveling toward the player who just scored.",
      ]),
      section('Technical constraints', [
        'Single File Structure: Combine HTML layout, CSS styling, and JavaScript logic inside one standard .html file.',
        'Primitive Rendering: Render paddles and the ball using primitive geometric shapes (e.g., filled white rectangles and circles on a dark canvas).',
      ]),
      section('What NOT to use', [
        'Do NOT use Physics Engines: Do NOT use Matter.js, Arcade Physics, or external game libraries. Calculate position shifts (x += dx, y += dy) and collision normal reflections manually.',
        'Do NOT use Built-in Engine Colliders: Write manual Axis-Aligned Bounding Box (AABB) or circle-box overlap checks.',
        'Do NOT use Key-Repeat Delays: Do not rely on native browser key-repeat events for paddle motion; maintain a continuous key state map to ensure smooth movement.',
      ]),
    ].join('\n\n'),
    optional_features: 'Adjust the bounce trajectory angle based on where the ball impacts the paddle (e.g., hitting near the top/bottom edges yields a steeper angle).',
    rubric: [],
  },
  {
    code: 'GAME-GD1', track: 'game', active: true,
    title: 'Wave Survival Game',
    problem_statement: 'Build a 2D game where the player survives escalating waves of enemies with at least two distinct behaviors.',
    requirements: section('Requirements', [
      'Player movement plus an attack/interaction mechanic (shooting, melee, etc.)',
      'At least 2 enemy types with genuinely different behavior — e.g. one that chases the player using simple pathfinding or steering, another that patrols or attacks from range',
      'A wave/spawn system where difficulty increases algorithmically each wave (more enemies, faster enemies, new enemy mixes) — not a hardcoded fixed sequence',
      'An explicit state machine for game states (Menu → Playing → Paused → Game Over) that pauses/resumes correctly without breaking timers, spawns, or physics',
      'Object pooling for frequently spawned objects (enemies and/or projectiles) instead of constant instantiate/destroy calls',
      'Persistent data across sessions: high score and at least one setting (volume, difficulty, etc.) saved to a local file and reloaded on next launch',
    ]),
    optional_features: null,
    rubric: [],
  },
  {
    code: 'GAME-GD2', track: 'game', active: true,
    title: 'Turn-Based Strategy Game with a Real AI Opponent',
    problem_statement: 'Build a turn-based game — Connect 4 or a simplified Checkers are good fits — where the player faces a computer opponent that actually plans ahead via game-tree search, not a random or single-move-lookahead bot.',
    requirements: section('Requirements', [
      'A clean turn-based game loop: valid-move detection, turn switching, and win/draw detection',
      'An AI opponent using minimax (or negamax) search to a reasonable depth — not randomness or a greedy one-move heuristic',
      'Alpha-beta pruning (or equivalent) so the AI stays responsive at that depth instead of grinding',
      'A heuristic evaluation function for non-terminal positions, since full-depth search usually isn\'t feasible — you should be able to justify what it weighs and why',
      'A board/UI that clearly shows valid moves and current state, with a way to start a new game',
    ]),
    optional_features: null,
    rubric: [],
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────
const TRACK_SLUGS = { ai_ml: 'ai_ml', web: 'web', game: 'game' };

async function run() {
  for (const line of fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: technical, error: domainError } = await supabase.from('domains').select('id').eq('slug', 'technical').maybeSingle();
  if (domainError || !technical) throw new Error(`technical domain not found: ${domainError?.message ?? ''}`);
  const { data: subdomains } = await supabase.from('subdomains').select('id,slug').eq('domain_id', technical.id);
  const subdomainFor = (track) => {
    const found = subdomains.find((s) => s.slug === TRACK_SLUGS[track]);
    if (!found) throw new Error(`subdomain for track ${track} not found`);
    return found.id;
  };

  const codes = projects.map((p) => p.code);
  const trackIds = [...new Set(projects.map((p) => subdomainFor(p.track)))];

  // The pool for these tracks is exactly this list: switch off anything else.
  const { data: others } = await supabase.from('projects').select('id,code').in('subdomain_id', trackIds);
  const retired = (others ?? []).filter((p) => !codes.includes(p.code));
  if (retired.length) {
    const { error } = await supabase.from('projects').update({ is_active: false }).in('id', retired.map((p) => p.id));
    if (error) throw new Error(`retire old projects: ${error.message}`);
  }

  for (const p of projects) {
    const row = {
      code: p.code,
      title: p.title,
      domain_id: technical.id,
      subdomain_id: subdomainFor(p.track),
      problem_statement: p.problem_statement,
      requirements: p.requirements,
      optional_features: p.optional_features,
      aws_services: [],
      evaluation_rubric: p.rubric.length ? { criteria: p.rubric } : null,
      is_active: p.active,
    };
    const { error } = await supabase.from('projects').upsert(row, { onConflict: 'code' });
    if (error) throw new Error(`${p.code}: ${error.message}`);
  }

  console.log(`loaded ${projects.length} projects; switched off ${retired.length} old sample project(s): ${retired.map((p) => p.code).join(', ') || 'none'}`);
  for (const track of Object.keys(TRACK_SLUGS)) {
    const active = projects.filter((p) => p.track === track && p.active).map((p) => p.code);
    console.log(`  ${track.padEnd(6)} pool (${active.length}): ${active.join(', ')}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  run().catch((err) => { console.error(err.message); process.exit(1); });
}
