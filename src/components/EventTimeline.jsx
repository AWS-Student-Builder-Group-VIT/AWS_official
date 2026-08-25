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

  /* Helix rotation: sweeps 270° across the full scroll distance
     (0° → -270°), bringing each card (90° apart) to the front. */
  const rotation = -scrollProgress * 270;

  /* Which card is most face-on to the camera (closest angle to 0°) */
  const activeIndex = useMemo(() => {
    const angles = timelineData.map((_, i) =>
      Math.abs(normalizeDeg(i * 90 + rotation))
    );
    return angles.indexOf(Math.min(...angles));
  }, [rotation]);

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
            4-Day Workshop Series
          </p>
          <h3 className="helix-title">
            AWS <span>Week</span> Event Timeline
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
              transform: `translate(-50%, -50%) rotateX(12deg) rotateY(${rotation}deg)`,
            }}
          >
            {timelineData.map((item, i) => {
              const cardBaseDeg = i * 90;
              const normalizedDeg = normalizeDeg(cardBaseDeg + rotation);

              /* Cosine-based opacity: 1 when face-on (0°), fades to ~0 at 90° */
              const cardOpacity = Math.max(0.07, Math.cos(normalizedDeg * Math.PI / 180));
              const isActive = i === activeIndex;

              return (
                <div
                  key={item.day}
                  className={`helix-card${isActive ? ' helix-card--active' : ''}`}
                  style={{
                    transform: `rotateY(${cardBaseDeg}deg) translateZ(310px)`,
                    opacity: cardOpacity,
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
            4 days · 4 technical sessions · Cloud Combat series ·{' '}
            <strong>aws week</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
