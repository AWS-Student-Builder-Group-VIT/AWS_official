import { useRef, useEffect, useState, useMemo } from 'react';
import './EventTimeline.css';

/* ═══════════════════════════════════════════════════════════
   AWS Week Event Timeline — 3D Helix Carousel
   Cards orbit on a corkscrew path; the helix spins on scroll.
   ═══════════════════════════════════════════════════════════ */

const timelineData = [
  {
    day: '15th June',
    title: 'AWS 101 : The Architecture SandBox',
    time: '6:00pm – 8:00pm',
    icon: 'dns',
    points: [
      'POC: Pihu Gupta | Speaker: Dr. Kakelli Anil Kumar | Venue: Google Meet',
      'Bridge the gap between software development and cloud computing.',
      'Virtualization under the hood — hypervisors & bare-metal server partitioning.',
      'Networking essentials: routers, switches, subnets, gateways.',
      'Live traffic-routing & firewall rule enforcement simulation demo.',
    ],
    quiz: {
      label: 'Cloud Combat 1.0 — Live Quiz',
      rounds: [
        'R1: Basic — 5 qns · 5 pts each',
        'R2: Intermediate — 5 qns · 10 pts each',
        'R3: Advanced — 3 qns · 15 pts each',
      ],
    },
  },
  {
    day: '17th June',
    title: 'AWS 102 : Cloud Genesis',
    time: '6:00pm – 8:00pm',
    icon: 'cloud',
    points: [
      'POC: Jaanya Bagdi | Speaker: Mr Chandra Mohan B | Venue: Google Meet',
      'Foundational cloud computing concepts & digital infrastructure.',
      'Role of cloud platforms in enabling scalable digital services.',
      'Insights into AWS services, industry applications & emerging trends.',
      'Establish a strong base for cloud & distributed systems learning.',
    ],
    quiz: {
      label: 'Cloud Combat 2.0 — Live Quiz',
      rounds: [
        'R1: Basic — 5 qns · 5 pts each',
        'R2: Intermediate — 5 qns · 10 pts each',
        'R3: Advanced — 3 qns · 15 pts each',
      ],
    },
  },
  {
    day: '18th June',
    title: 'AWS 103 : The AI Cloud Stack',
    time: '6:00pm – 9:00pm',
    icon: 'smart_toy',
    points: [
      'POC: Abhishek Kumar | Hosts: Abhishek & Jaanya | Venue: Google Meet',
      'Leverage AWS to build, deploy & scale AI-powered applications.',
      'Core ML workflows, model deployment & real-world AI architecture.',
      'Segment 1: ML on AWS — SageMaker, EC2, Fake News Detection showcase.',
      'Segment 2: Gen AI on AWS — LLMs, Prompt Engineering, Live Demo.',
    ],
  },
  {
    day: '19th June',
    title: 'AWS 104 : Data Nexus',
    time: '6:00pm – 8:00pm',
    icon: 'database',
    points: [
      'POC: Arshi Saxena | Host: Vidhi Jain | Venue: Google Meet',
      'Fundamentals of modern database systems for cloud-based apps.',
      'Relational vs. non-relational databases & storage paradigms.',
      'Managed DB services — simplified deployment, scaling & ops.',
      'Cloud-native data management & integration workflows.',
    ],
    quiz: {
      label: 'Cloud Combat 3.0 — Case Study Activity',
      rounds: [],
    },
  },
  {
    day: '28th Aug',
    title: 'AWS Workshop : Cloud Foundations Bootcamp',
    time: 'Venue: KAMARAJ AUDITORIUM · Speaker: Mr. Vignesh Devan',
    icon: 'terminal',
    points: [
      'Venue: KAMARAJ AUDITORIUM | Speaker: Mr. Vignesh Devan, Senior Data Scientist at Amazon.',
      'Core computing fundamentals, internet & server architectures, and scalable cloud deployments.',
      'Service models (IaaS, PaaS, SaaS), AWS global infra, pricing models & Management Console.',
      'Generative AI & cloud bridge: LLMs, Amazon Bedrock, SageMaker, Amazon Q & Autonomous AI Agents.',
      'Live AWS Console lab: Launching EC2 instances, creating S3 buckets, IAM roles & security policies.',
    ],
    quiz: {
      label: 'Hands-on Console Labs & Topics',
      rounds: [
        'EC2 & S3 Deployment',
        'IAM Security & Roles',
        'Bedrock, SageMaker & Q',
      ],
    },
  },
  {
    day: '12th & 13th Sept',
    title: 'HackQuest : AWS Mystery Box Hackathon',
    time: '24-Hour Hackathon · Venue: SAROJINI NAIDU AUDITORIUM · In Assoc. with HDFC Bank',
    icon: 'military_tech',
    points: [
      'Venue: SAROJINI NAIDU AUDITORIUM | Organised by AWS SBG VIT with HDFC Bank.',
      'Teams of 2-4 tackle unique Mystery Box problem statements with Cloud Architecture builds.',
      'Round 1 (Ideation): Problem statement breakdown, approach formulation & tech panel review.',
      'Round 2 (Development): Cloud architecture build, 14 mini-games Point Shop & 30-min Chaos Card twist.',
      'Round 3 (Final Build): Full project completion, live deployment demo & pitch to judging panel.',
      'Judged by Mr. Ranjithkumar S — prizes for top 3 teams and special recognition for Best UI/UX.',
    ],
    quiz: {
      label: '3-Round Hackathon Structure',
      rounds: [
        'R1: Ideation Phase',
        'R2: Development & Chaos Card',
        'R3: Final Pitch & Demo',
      ],
    },
  },
];

/* ─────────────────────────────────────────────
   Utility: normalize degrees to [-180, 180]
───────────────────────────────────────────── */
function normalizeDeg(deg) {
  return ((deg % 360) + 540) % 360 - 180;
}

export default function EventTimeline() {
  const wrapRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  /* Helix rotation: sweeps dynamically based on number of cards */
  const stepDeg = 360 / timelineData.length;
  const totalSweep = (timelineData.length - 1) * stepDeg;
  const rotation = -scrollProgress * totalSweep;

  /* Which card is most face-on to the camera (closest angle to 0°) */
  const activeIndex = useMemo(() => {
    const angles = timelineData.map((_, i) =>
      Math.abs(normalizeDeg(i * stepDeg + rotation))
    );
    return angles.indexOf(Math.min(...angles));
  }, [rotation, stepDeg]);

  /* Scroll listener — tracks progress within the wrap element */
  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / total));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // seed on mount
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="helix-wrap" ref={wrapRef}>
      <div className="helix-sticky">

        {/* ── Section Header ── */}
        <div className="helix-header">
          <p className="helix-eyebrow">
            <span className="helix-eyebrow-dot" />
            Flagship Events & Workshop Series
          </p>
          <h3 className="helix-title">
            AWS Club <span>Events</span> Timeline
          </h3>
        </div>

        {/* ── 3D Helix Scene ── */}
        <div className="helix-scene">

          {/* Decorative orbital rings (purely visual, outside preserve-3d ctx) */}
          <div className="helix-ring helix-ring-1" />
          <div className="helix-ring helix-ring-2" />

          {/* Instruction hint */}
          <div className="helix-hint">
            <span className="material-symbols-outlined">arrow_downward</span>
            Scroll to explore
          </div>

          {/* 3D rotating stage — transform driven by scroll */}
          <div
            className="helix-stage"
            style={{
              transform: `translate(-50%, -50%) rotateX(4deg) rotateY(${rotation}deg)`,
            }}
          >
            {timelineData.map((item, i) => {
              const cardBaseDeg = i * stepDeg;
              const normalizedDeg = normalizeDeg(cardBaseDeg + rotation);
              const absDeg = Math.abs(normalizedDeg);
              const isActive = i === activeIndex;

              // Only cards within 44 degrees of front-facing are rendered; adjacent 60-deg cards are completely hidden
              const isVisible = absDeg < 44;
              const cardOpacity = isVisible ? Math.max(0, Math.cos((absDeg * Math.PI) / 88)) : 0;
              const cardScale = isVisible ? Math.max(0.92, 1 - absDeg * 0.0018) : 0.88;

              return (
                <div
                  key={item.day + i}
                  className={`helix-card${isActive ? ' helix-card--active' : ''}`}
                  style={{
                    transform: `rotateY(${cardBaseDeg}deg) translateZ(270px) scale(${cardScale})`,
                    opacity: cardOpacity,
                    visibility: isVisible ? 'visible' : 'hidden',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  {/* Left Panel — Day Number */}
                  <div className="helix-card-left">
                    <span className="helix-card-num">0{i + 1}</span>
                    <span className="helix-card-date">{item.day}</span>
                    <span className="material-symbols-outlined helix-card-icon">
                      {item.icon}
                    </span>
                  </div>

                  {/* Right Panel — Content */}
                  <div className="helix-card-right">
                    <p className="helix-card-title">{item.title}</p>
                    <span className="helix-card-time">{item.time}</span>
                    <ul className="helix-card-points">
                      {item.points.map((pt, j) => (
                        <li key={j}>{pt}</li>
                      ))}
                    </ul>
                    {item.quiz?.label && (
                      <div className="helix-quiz-block">
                        <span className="helix-quiz-label">{item.quiz.label}</span>
                        {item.quiz.rounds?.length > 0 && (
                          <div className="helix-quiz-rounds">
                            {item.quiz.rounds.map((r, j) => (
                              <span className="helix-round-pill" key={j}>{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progress Tracker ── */}
        <div className="helix-progress-bar">
          {/* Animated fill line */}
          <div
            className="helix-progress-fill"
            style={{ width: `${scrollProgress * 100}%` }}
          />
          {timelineData.map((item, i) => (
            <div
              key={i}
              className={[
                'helix-progress-step',
                i === activeIndex ? 'active' : '',
                i < activeIndex ? 'done' : '',
              ].join(' ')}
            >
              <div className="helix-progress-node" />
              <span className="helix-progress-label">{item.day}</span>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="helix-footer-bar">
          <p>
            6 Flagship Events · Hands-on Workshops · Hackathons ·{' '}
            <strong>AWS SBG VIT</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
