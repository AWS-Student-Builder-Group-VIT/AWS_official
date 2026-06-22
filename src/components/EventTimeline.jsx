import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import './EventTimeline.css';

/* ═══════════════════════════════════════════════════════════
   AWS Week Event Timeline — Kinetic Infrastructure Theme
   ═══════════════════════════════════════════════════════════ */

const timelineData = [
  {
    day: '15th June',
    title: 'AWS 101 : The Architecture SandBox',
    time: '6:00pm to 8:00pm',
    icon: 'dns',
    points: [
      'POC: Pihu Gupta | Guest Speaker: Dr. Kakelli Anil Kumar | Venue: Google Meet',
      'Bridge the gap between software development and cloud computing.',
      'Dive deeper into virtualization under the hood to see how hypervisors partition bare-metal servers.',
      'Explore networking essentials: routers, switches, subnets, and gateways.',
      'Demonstration of traffic routing and firewall rule enforcement using a live visual simulation tool.',
      'Equips students with practical systems knowledge for modern software development roles.'
    ],
    quiz: {
      label: 'Cloud Combat 1.0 (Live quiz)',
      rounds: [
        'Round 1: Basic — 5 qns · 5 pts each · Top 70% advance',
        'Round 2: Intermediate — 5 qns · 10 pts each · Top 40% advance',
        'Round 3: Advanced — 3 qns · 15 pts each',
      ],
    },
  },
  {
    day: '17th June',
    title: 'AWS 102 : Cloud Genesis',
    time: '6:00pm to 8:00pm',
    icon: 'cloud',
    points: [
      'POC: Jaanya Bagdi | Guest Speaker: Mr Chandra Mohan B | Venue: Google Meet',
      'Introduction to foundational concepts of cloud computing and their relevance in modern tech.',
      'Key cloud concepts, role of cloud platforms in enabling scalable digital services.',
      'Insights into AWS services, industry applications, and emerging trends.',
      'Establish a strong conceptual foundation for more advanced topics in cloud and distributed systems.'
    ],
    quiz: {
      label: 'Cloud Combat 2.0 (Live quiz)',
      rounds: [
        'Round 1: Basic — 5 qns · 5 pts each · Top 70% advance',
        'Round 2: Intermediate — 5 qns · 10 pts each · Top 40% advance',
        'Round 3: Advanced — 3 qns · 15 pts each',
      ],
    },
  },
  {
    day: '18th June',
    title: 'AWS 103 : The AI Cloud Stack',
    time: '6:00pm to 9:00pm',
    icon: 'smart_toy',
    points: [
      'POC: Abhishek Kumar | Hosts: Abhishek Kumar & Jaanya Bagdi | Venue: Google Meet',
      'Explore how AWS services can be leveraged to build, deploy, and scale modern AI applications.',
      'Core AWS services used in ML workflows, model deployment strategies, and real-world AI system architecture.',
      'Introduce Generative AI concepts, prompt engineering, and large language models.',
      'Segment 1 (6:10 – 7:30 PM): ML on AWS (S3, SageMaker, EC2, Project Showcase: Fake News Detection).',
      'Segment 2 (7:30 – 8:50 PM): Generative AI on AWS (LLMs, Prompt Engineering, Live App Demo).'
    ],
  },
  {
    day: '19th June',
    title: 'AWS 104 : Data Nexus',
    time: '6:00pm to 8:00pm',
    icon: 'database',
    points: [
      'POC: Arshi Saxena | Host: Vidhi Jain | Venue: Google Meet',
      'Introduction to the fundamentals of modern database systems and their role in cloud-based applications.',
      'Explore different data storage approaches and relational vs non-relational databases.',
      'Learn how managed database services simplify deployment, scaling, and maintenance.',
      'Gain insight into database architecture, cloud-native data management, and integration workflows.',
      'Additional: Cloud Combat 3.0 - Case Study Activity'
    ],
  },
];

/* ── Single Timeline Card ── */
function TimelineCard({ item, index, isLeft }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className="evt-tl-item"
      data-side={isLeft ? 'left' : 'right'}
      initial={{ opacity: 0, x: isLeft ? -50 : 50, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Content Side */}
      <div className="evt-tl-content" style={{ order: isLeft ? 1 : 3 }}>
        <span className="evt-day-label">{item.day}</span>
        <p className="evt-day-title">{item.title}</p>
        <span className="evt-day-sub">{item.time}</span>

        <ul className="evt-day-points">
          {item.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>

        {/* Quiz Block (only Day 1) */}
        {item.quiz && (
          <div className="evt-quiz-block">
            <span className="evt-quiz-label">{item.quiz.label}</span>
            <div className="evt-quiz-rounds">
              {item.quiz.rounds.map((round, i) => (
                <span className="evt-round-pill" key={i}>{round}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Node */}
      <div className="evt-tl-node" style={{ order: 2 }}>
        <span className="material-symbols-outlined">{item.icon}</span>
      </div>

      {/* Empty Side */}
      <div className="evt-tl-empty" style={{ order: isLeft ? 3 : 1 }} />

      {/* Connector Line */}
      <div className="evt-tl-connector" data-side={isLeft ? 'left' : 'right'} />
    </motion.div>
  );
}

/* ── Main Export ── */
export default function EventTimeline() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <div className="evt-tl-wrap">
      {/* Section Header */}
      <motion.div
        ref={headerRef}
        className="evt-tl-header"
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="evt-eyebrow">
          <span className="evt-eyebrow-dot" />
          4-Day Workshop Series
        </p>
        <h3 className="evt-tl-title">
          AWS <span>Week</span> Event Timeline
        </h3>
      </motion.div>

      {/* Timeline Body */}
      <div className="evt-tl-container">
        {/* Central Spine */}
        <div className="evt-tl-spine" />

        {timelineData.map((item, index) => (
          <TimelineCard
            key={item.day}
            item={item}
            index={index}
            isLeft={index % 2 === 0}
          />
        ))}
      </div>

      {/* Footer */}
      <motion.div
        className="evt-footer-bar"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <p>
          4 days · 4 technical sessions · Cloud Combat series · <strong>aws week</strong>
        </p>
      </motion.div>
    </div>
  );
}
