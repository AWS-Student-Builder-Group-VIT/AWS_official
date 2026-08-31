/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX HACKATHON — Static Data
   ═══════════════════════════════════════════════════════════ */

/* ── Wheel Data ── */
export const WHEEL_SEGMENTS = [
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: 'Better Luck', color: '#001a2a', stroke: '#00A8FF' },
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: '🥇 Golden Pass', color: '#1a1000', stroke: '#FFD700' },
  { label: '🃏 Wildcard', color: '#0f0025', stroke: '#b24dff' },
];

/* ── How It Works Steps ── */
export const STEPS = [
  { num: 1, label: 'Team Registration', color: 'orange' },
  { num: 2, label: 'Topic Reveal', color: 'blue' },
  { num: 3, label: 'Build From Scratch', color: 'purple' },
  { num: 4, label: 'Earn Points', color: 'orange' },
  { num: 5, label: 'Unlock Advantages', color: 'blue' },
  { num: 6, label: 'Face Chaos Events', color: 'purple' },
  { num: 7, label: 'Final Pitch', color: 'orange' },
];

/* ── Rules ── */
export const RULES = [
  { icon: '🎯', title: 'Topics Assigned On The Spot', desc: 'Zero preparation possible. Your problem statement is revealed only at kickoff. Pure skill, no shortcuts.' },
  { icon: '🔒', title: 'No Pre-Built Projects', desc: 'Everything is built during the event. Bringing existing code will get your team disqualified.' },
  { icon: '⚡', title: 'Real-Time Innovation', desc: 'Ideas born and executed live. Judges observe the build process, not just the outcome.' },
  { icon: '🏗️', title: 'Build Everything During The Event', desc: 'Architecture, design, code, deployment — all within the window. Clock is always ticking.' },
];

/* ── Categorized Mystery Box Questions ── */
export const MYSTERY_BOX_QUESTIONS = [
  // ── EASY (100 Points Base) ──
  {
    id: 'easy-1',
    title: 'Cloud Resume Builder with CI/CD',
    difficulty: 'Easy',
    points: 100,
    desc: 'Design a web app that helps students build their resume and deploys it automatically as a static website on AWS S3/CloudFront, integrated with a mock GitHub Action pipeline.',
    tags: ['S3', 'CloudFront', 'GitHub Actions']
  },
  {
    id: 'easy-2',
    title: 'Lost & Found Intelligent Matcher',
    difficulty: 'Easy',
    points: 100,
    desc: 'Build a campus lost & found portal using DynamoDB and S3 for photo uploads with keyword tag searching and verification claims.',
    tags: ['DynamoDB', 'S3', 'API Gateway']
  },
  {
    id: 'easy-3',
    title: 'Static Portfolio with Serverless Contact Form',
    difficulty: 'Easy',
    points: 100,
    desc: 'Create a responsive developer portfolio hosted on S3 and CloudFront with an API Gateway + SES/Lambda backend to process and email incoming contact inquiries.',
    tags: ['S3', 'Lambda', 'SES']
  },
  {
    id: 'easy-4',
    title: 'AWS Cost-Optimizer Dashboard',
    difficulty: 'Easy',
    points: 100,
    desc: 'Create a dashboard app that analyzes mock AWS billing reports to find idle EC2 instances, underutilized S3 buckets, and provides actionable recommendations to save costs.',
    tags: ['CloudWatch', 'Cost Explorer', 'React']
  },
  {
    id: 'easy-5',
    title: 'Serverless URL Shortener & Analytics',
    difficulty: 'Easy',
    points: 100,
    desc: 'Build a high-performance URL shortener with click analytics and geolocation counters using AWS Lambda, DynamoDB, and CloudFront edge routing.',
    tags: ['Lambda', 'DynamoDB', 'CloudFront']
  },

  // ── MEDIUM (140 Points) ──
  {
    id: 'med-1',
    title: 'Smart Campus Navigation Engine',
    difficulty: 'Medium',
    points: 140,
    desc: 'Build a campus guide prototype using AWS Location Service and Amazon Lex that helps new students navigate a campus, find classrooms, and ask assistant bots for directions.',
    tags: ['Location Service', 'Amazon Lex', 'Lambda']
  },
  {
    id: 'med-2',
    title: 'Serverless Student Club Portal',
    difficulty: 'Medium',
    points: 140,
    desc: 'Design a serverless, highly-scalable backend on AWS (Lambda, API Gateway, DynamoDB) that allows student clubs to manage events, registrations, and announcements with zero server costs.',
    tags: ['Lambda', 'DynamoDB', 'API Gateway', 'Cognito']
  },
  {
    id: 'med-3',
    title: 'IVS Live Stream Hub with Interactive Chat',
    difficulty: 'Medium',
    points: 140,
    desc: 'Create a low-latency streaming hub using Amazon IVS (Interactive Video Service) that allows developers to stream technical workshops and embed interactive live chat polls.',
    tags: ['Amazon IVS', 'WebSockets', 'Lambda']
  },
  {
    id: 'med-4',
    title: 'IoT Smart Energy Classroom Monitor',
    difficulty: 'Medium',
    points: 140,
    desc: 'Design a simulated IoT dashboard using AWS IoT Core that ingests temperature and power data from smart classrooms, visualizes it, and alerts admins when energy waste is detected.',
    tags: ['IoT Core', 'DynamoDB', 'SNS']
  },
  {
    id: 'med-5',
    title: 'Event Ticketing with Dynamic Queue',
    difficulty: 'Medium',
    points: 140,
    desc: 'Build an event ticketing portal with surge seat reservation and queue management using SQS, Lambda, and DynamoDB transactions to prevent double-booking.',
    tags: ['SQS', 'Lambda', 'DynamoDB']
  },

  // ── HARD (180 Points) ──
  {
    id: 'hard-1',
    title: 'AI Study Companion with Bedrock',
    difficulty: 'Hard',
    points: 180,
    desc: 'Build a web app using Amazon Bedrock and AWS Lambda that allows students to upload syllabus docs or notes and automatically generates interactive quizzes, mind maps, and flashcards.',
    tags: ['Amazon Bedrock', 'Lambda', 'S3', 'Vector DB']
  },
  {
    id: 'hard-2',
    title: 'Automated Code Reviewer & Debugger Bot',
    difficulty: 'Hard',
    points: 180,
    desc: 'Develop an automated code reviewer tool that integrates with a Git repo, runs code analysis via Amazon CodeGuru or Bedrock, and leaves helpful debugging comments on pull requests.',
    tags: ['Amazon Bedrock', 'CodeGuru', 'Lambda', 'GitHub API']
  },
  {
    id: 'hard-3',
    title: 'Biometric Attendance via Face Recognition',
    difficulty: 'Hard',
    points: 180,
    desc: 'Build a fast attendance system prototype that allows event organizers to take a photo of attendees and verify their registration in real-time using Amazon Rekognition.',
    tags: ['Rekognition', 'S3', 'Lambda', 'DynamoDB']
  },
  {
    id: 'hard-4',
    title: 'Real-time Collaborative Architecture Whiteboard',
    difficulty: 'Hard',
    points: 180,
    desc: 'Develop a real-time collaborative whiteboard app using AWS AppSync or WebSockets that allows student teams to map out architectural diagrams synchronously with live cursor tracking.',
    tags: ['AppSync', 'GraphQL', 'WebSockets', 'DynamoDB']
  },
  {
    id: 'hard-5',
    title: 'Autonomous Cloud Security Incident Responder',
    difficulty: 'Hard',
    points: 180,
    desc: 'Design an AI-driven SecOps bot that monitors CloudTrail & GuardDuty events, diagnoses threats via Bedrock, and automatically generates mitigation Lambda triggers to isolate compromised resources.',
    tags: ['GuardDuty', 'CloudTrail', 'Bedrock', 'Step Functions']
  }
];

/* ── Points Sources ── */
export const POINTS = [
  { icon: '🧠', val: '+50', name: 'AWS Quiz', pct: 70, color: '#FF9900' },
  { icon: '🧩', val: '+40', name: 'Cloud Puzzle', pct: 55, color: '#00A8FF' },
  { icon: '🐛', val: '+60', name: 'Debug Challenge', pct: 40, color: '#7C4DFF' },
  { icon: '🗺️', val: '+45', name: 'Treasure Hunt', pct: 30, color: '#00c864' },
  { icon: '⭐', val: '+30', name: 'Bonus Tasks', pct: 60, color: '#ffd700' },
  { icon: '⚡', val: '+80', name: 'Fastest Solver', pct: 20, color: '#ff3264' },
];

/* ── Shop Items ── */
export const SHOP_ITEMS = [
  {
    id: 'change-topic',
    price: '50 - 150 pts',
    title: 'Change Challenge Topic',
    desc: 'Leader Only (1-Time Use): Reroll or pivot your mystery topic. Upgrading difficulty costs fewer points (Med→Hard: 50 pts, Easy→Med: 75 pts), same tier costs 100 pts, while downgrading costs 125-150 pts.',
    isSpecialSwap: true,
  },
  { price: '150 pts', title: 'Mentor Help', desc: '30 minutes with an expert mentor for technical guidance on your build.' },
  { price: '80 pts', title: 'Hint Card', desc: 'Unlock a targeted hint for your current problem from the organizers.' },
  { price: '100 pts', title: 'Technical Review', desc: 'Get a quick code review and feedback from a senior developer.' },
  { price: '120 pts', title: 'Extra Pitch Time', desc: 'Buy 3 additional minutes for your final presentation to the judges.' },
  { price: '200 pts', title: 'Second Chance Token', desc: 'Save your team from elimination. One-time use per team only.' },
  { price: '180 pts', title: 'Reveal Judging Criteria', desc: 'Peek at what judges are scoring most heavily before your pitch.' },
  { price: '250 pts', title: 'Recruit a Friend', desc: 'Add a temporary external collaborator to your team for 2 hours.' },
];

/* ── Mystery Box Rewards & Twists ── */
export const REWARDS = ['+100 Points', 'Mentor Assistance', 'Extra Review Time', 'Hint Card', 'Technical Support'];
export const TWISTS = ['Technology Restriction', 'Topic Modification', 'Additional Feature Req.', 'Surprise Client Request'];

/* ── Chaos Events ── */
export const CHAOS_EVENTS = [
  { icon: '🌐', title: 'Market Shift', desc: 'Your target user persona has changed completely. Rethink your value proposition.' },
  { icon: '💸', title: 'Investor Pitch', desc: 'An investor arrives in 15 minutes. You must pitch your MVP immediately.' },
  { icon: '🔐', title: 'Security Alert', desc: 'A critical vulnerability has been found in your stack. Patch it now.' },
  { icon: '✂️', title: 'Budget Cut', desc: 'Your cloud budget has been slashed by 60%. Optimize your architecture.' },
  { icon: '📈', title: 'Viral Growth', desc: 'Congrats — your app went viral. Now handle 100× the expected load.' },
  { icon: '🔄', title: 'Client Revision', desc: 'The client changed their mind. Major feature redesign required. Today.' },
];

/* ── Penalties ── */
export const PENALTIES = [
  { icon: '💸', val: '−50 pts', name: 'Point Loss' },
  { icon: '🃏', val: '−1', name: 'Lose Hint' },
  { icon: '⚙️', val: '+1', name: 'Extra Feature Required' },
  { icon: '⏱️', val: '−2 min', name: 'Reduced Pitch Time' },
  { icon: '🎯', val: '×1', name: 'Surprise Judge Question' },
];

/* ── Finale Pills ── */
export const FINALE_PILLS = ['🎁 Mystery Boxes', '⚡ Chaos Cards', '🛒 Point Shop', '🎰 Spin Wheel', '🎤 Final Presentation'];
