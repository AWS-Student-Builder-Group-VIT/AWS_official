// ═══════════════════════════════════════════════════════════
//  AWS QUIZ DATA — All question banks & case studies
// ═══════════════════════════════════════════════════════════

// ── Regular Quizzes ─────────────────────────────────────────

export const QUIZZES = [
  {
    id: 'db_round1',
    title: 'AWS Databases - Round 1',
    subtitle: 'Database Selection Fundamentals.',
    category: 'Beginner',
    questions: 5,
    duration: '5 min',
    topics: ['RDS', 'DynamoDB', 'Aurora', 'Redshift'],
    color: '#10b981',
    elimination: true,
  },
  {
    id: 'db_round2',
    title: 'AWS Databases - Round 2',
    subtitle: 'Complex Architecture Scenarios.',
    category: 'Intermediate',
    questions: 5,
    duration: '5 min',
    topics: ['Architecture', 'Polyglot Persistence', 'Scalability'],
    color: '#3b82f6',
    elimination: true,
  },
  {
    id: 'db_round3',
    title: 'AWS Databases - Round 3 (Boss)',
    subtitle: 'High Scale & Security Failures.',
    category: 'Advanced',
    questions: 3,
    duration: '5 min',
    topics: ['Bottlenecks', 'Security', 'Anti-Patterns'],
    color: '#f43f5e',
    elimination: true,
  }
];

export const CASE_STUDIES = [];

// ── Question Banks ───────────────────────────────────────────

export const QUESTION_BANKS = {
  db_round1: [
    {
      id: 1, category: 'Database Selection',
      question: 'A food delivery app stores user profiles, order history, and payment information. The data is highly structured, relationships exist across multiple entities, and the app runs complex queries joining users, orders, and payments together. Which AWS database service is the most appropriate choice?',
      options: [
        'Amazon DynamoDB - because it offers millisecond latency for high-speed lookups',
        'Amazon RDS - because it is built for structured relational data with complex query support and ACID compliance',
        'Amazon Aurora - because it is MySQL-compatible and auto-scales without manual intervention',
        'Amazon Redshift - because it handles large volumes of data with petabyte-scale SQL queries'
      ],
      correct: 1,
      explanation: 'RDS is purpose-built for structured relational data with support for complex JOIN queries across multiple tables. Payment and order data requires ACID compliance, which RDS guarantees out of the box.'
    },
    {
      id: 2, category: 'Database Selection',
      question: 'A gaming company needs to serve a global leaderboard that handles millions of score lookups per second. Players expect their rank to be returned instantly, and any latency above a few milliseconds results in a poor experience. Which AWS database service should the team use?',
      options: [
        'Amazon RDS - because it supports complex ranking queries using ORDER BY and LIMIT clauses',
        'Amazon Aurora - because it is five times faster than standard RDS and can handle high read traffic',
        'Amazon DynamoDB - because it delivers single-digit millisecond latency at any scale using a key-value model',
        'Amazon Redshift - because it is optimised for running large analytical queries across historical score data'
      ],
      correct: 2,
      explanation: 'DynamoDB is designed for exactly this use case - key-value lookups at massive throughput with consistent single-digit millisecond response times regardless of scale. Leaderboard score lookups by player ID map directly to its partition key model.'
    },
    {
      id: 3, category: 'Database Selection',
      question: 'A ride-hailing platform receives driver location updates every two seconds from millions of active drivers simultaneously. The data has no fixed structure and the system must sustain extremely high write throughput without performance degradation. Which AWS database service is the correct choice?',
      options: [
        'Amazon RDS - because it supports geolocation data types and spatial queries natively',
        'Amazon Aurora - because it auto-scales and can absorb unpredictable traffic spikes',
        'Amazon Redshift - because it is built to store and query large volumes of location history',
        'Amazon DynamoDB - because it handles high write throughput at scale with a flexible schema and no fixed structure requirements'
      ],
      correct: 3,
      explanation: 'DynamoDB is built for write-heavy, high-frequency workloads with no schema constraints. Millions of location updates per minute map directly to its horizontal scaling model, where writes are distributed automatically across partitions.'
    },
    {
      id: 4, category: 'Database Selection',
      question: 'A bank needs to store customer account transactions. Every operation - deposits, withdrawals, and transfers must either complete fully or not at all. Partial writes that leave accounts in an inconsistent state are completely unacceptable. Which AWS database service should the bank use?',
      options: [
        'Amazon DynamoDB - because it offers the fastest write throughput for high-frequency transaction processing',
        'Amazon RDS with PostgreSQL - because it provides full ACID compliance guaranteeing atomicity and consistency across every transaction',
        'Amazon Aurora - because it is MySQL-compatible and five times faster than standard relational databases',
        'Amazon DynamoDB - because it supports flexible schema design which makes it easy to add new transaction fields over time'
      ],
      correct: 1,
      explanation: 'Financial transactions demand strict ACID guarantees. RDS with PostgreSQL ensures that every transaction either commits completely or rolls back entirely, preventing any partial writes or data inconsistencies across account records.'
    },
    {
      id: 5, category: 'Database Selection',
      question: 'A startup is building a backend for a multi-tenant SaaS platform. They need a relational database that is fully MySQL-compatible, requires zero manual patching or scaling, and must handle significantly higher read and write throughput than a standard RDS instance. Which AWS database service is the most appropriate choice?',
      options: [
        'Amazon DynamoDB - because it is serverless and requires no manual provisioning',
        'Amazon RDS with MySQL - because it is the standard choice for all relational workloads on AWS',
        'Amazon Aurora - because it is MySQL-compatible, fully managed, delivers up to five times the throughput of standard RDS, and scales automatically',
        'Amazon Redshift - because it handles complex multi-table queries at petabyte scale'
      ],
      correct: 2,
      explanation: 'Aurora is purpose-built for exactly this scenario. It is MySQL and PostgreSQL compatible, removes all manual ops overhead, and delivers significantly higher throughput than standard RDS. It is the right upgrade path when RDS starts showing performance limitations.'
    }
  ],

  db_round2: [
    {
      id: 1, category: 'Architecture Scenarios',
      question: 'A food delivery startup needs to store user accounts and order history with complex relational queries, handle real-time restaurant menu lookups where each restaurant has a completely different set of attributes, and manage payment transactions that require strict ACID compliance. Which combination of AWS database services best addresses all needs?',
      options: [
        'DynamoDB + Aurora + Redshift',
        'RDS + DynamoDB + Aurora',
        'DynamoDB + RDS + DocumentDB',
        'Aurora + RDS + ElastiCache'
      ],
      correct: 1,
      explanation: 'RDS handles structured relational data like user accounts with ACID compliance. DynamoDB handles flexible restaurant menu storage where schema varies per item. Aurora serves as the managed auto-scaling relational layer for high-throughput payment transaction queries.'
    },
    {
      id: 2, category: 'Architecture Scenarios',
      question: 'A healthcare portal needs to store patient records and billing data with strict transactional guarantees, manage doctor consultation notes that vary widely in structure, and handle appointment scheduling with complex joins across patients, doctors, and departments. Which database stack should they deploy?',
      options: [
        'DynamoDB + Aurora + RDS',
        'Aurora + DynamoDB + Redshift',
        'RDS + DynamoDB + Aurora',
        'DynamoDB + RDS + ElastiCache'
      ],
      correct: 2,
      explanation: 'RDS provides ACID compliance for billing and patient records. DynamoDB stores flexible doctor notes where no fixed schema can be enforced. Aurora handles appointment scheduling queries that require high-throughput complex joins across multiple entities.'
    },
    {
      id: 3, category: 'Architecture Scenarios',
      question: 'A social media platform needs to store user profiles and follower relationships with strict relational integrity, handle activity feeds at massive scale with a flexible schema and high write throughput, and manage a MySQL-compatible database for internal reporting that auto-scales. Which combination of services should the team choose?',
      options: [
        'RDS + Aurora + DynamoDB',
        'DynamoDB + Redshift + RDS',
        'Aurora + ElastiCache + RDS',
        'RDS + DynamoDB + Redshift'
      ],
      correct: 0,
      explanation: 'RDS stores user profiles and follower graphs with relational integrity. Aurora provides the MySQL-compatible managed engine with auto-scaling for internal reporting. DynamoDB handles activity feeds with its flexible schema and high write throughput at scale.'
    },
    {
      id: 4, category: 'Architecture Scenarios',
      question: 'An edtech startup needs to store student profiles, course enrollments, and grade records with complex relational queries, manage quiz submission data where each quiz has a different set of question types, and run a fully managed MySQL-compatible database for faculty dashboards that needs to handle unpredictable traffic spikes. Which stack should they deploy?',
      options: [
        'DynamoDB + Redshift + Aurora',
        'RDS + Aurora + DynamoDB',
        'Aurora + RDS + ElastiCache',
        'DynamoDB + RDS + DocumentDB'
      ],
      correct: 1,
      explanation: 'RDS handles structured relational data like enrollments and grades with ACID compliance. Aurora handles faculty dashboard queries with its auto-scaling MySQL-compatible engine. DynamoDB stores flexible quiz submission data where schema differs across every quiz type.'
    },
    {
      id: 5, category: 'Architecture Scenarios',
      question: 'A ride-hailing platform needs to store driver/rider profiles with relational integrity, handle real-time driver location updates arriving every two seconds from millions of devices with high write throughput and flexible schema, and manage trip records and fare calculations using a fully managed relational database that scales automatically. Which combination is correct?',
      options: [
        'Aurora + Redshift + DynamoDB',
        'DynamoDB + RDS + ElastiCache',
        'RDS + DynamoDB + Aurora',
        'Aurora + DynamoDB + DocumentDB'
      ],
      correct: 2,
      explanation: 'RDS stores structured profiles with relational integrity. DynamoDB handles the high-frequency location updates with its schema-flexible NoSQL model. Aurora manages trip records and fare calculations with its auto-scaling managed relational engine.'
    }
  ],

  db_round3: [
    {
      id: 1, category: 'Deep Dive',
      question: 'A junior engineer at a messaging company suggests migrating all message data - 100 billion messages per day, into a single Amazon RDS PostgreSQL instance, with one row per message indexed by sender and receiver. Which of the following best describes what would break at this scale?',
      options: [
        'RDS does not support indexing on multiple columns so queries will fail',
        'RDS cannot handle this write volume since it scales vertically on a single node, creating a bottleneck regardless of read replicas',
        'PostgreSQL is not supported on RDS so the engine choice is invalid',
        'RDS does not support text data so message content cannot be stored'
      ],
      correct: 1,
      explanation: 'RDS scales vertically and writes go to a single primary node. At 100 billion messages a day, that single node becomes a bottleneck. DynamoDB handles this with automatic horizontal partitioning, distributing writes across nodes with no upper limit on throughput.'
    },
    {
      id: 2, category: 'Deep Dive',
      question: 'A healthcare startup decides to store all of their application data (patient profiles, notes, labs, billing) in a single DynamoDB table. The system performs well for 50 users. Upon onboarding a hospital with 10,000 patients, billing queries begin failing and doctors are unable to retrieve complete histories. What is the core reason for this failure?',
      options: [
        'DynamoDB tables have a 10,000 item limit so the data exceeded capacity',
        'DynamoDB does not support encryption so patient data was rejected',
        'DynamoDB has no JOIN support and no ACID guarantees across records, so billing queries that relate patients, appointments, and invoices together break at scale',
        'DynamoDB is a relational database so it cannot store JSON doctor notes'
      ],
      correct: 2,
      explanation: 'DynamoDB is built for single-item lookups at speed, not multi-entity relational queries. Billing logic that needs to join patients, appointments, and invoices requires RDS. The fix is polyglot persistence.'
    },
    {
      id: 3, category: 'Deep Dive',
      question: 'A development team deploys their Amazon RDS MySQL instance with a public IP address, configures the security group to allow inbound traffic on port 3306 from 0.0.0.0/0, and hardcodes the database password directly in their Node.js application before pushing it to a public GitHub repository. Three hours after deployment, the database is completely wiped. Which combination of mistakes directly led to this breach?',
      options: [
        'They used MySQL instead of PostgreSQL and chose the wrong port number',
        'They did not enable Multi-AZ and skipped automated backups',
        'Public IP with 0.0.0.0/0 exposed the DB to the internet, and the hardcoded password on GitHub gave attackers the credentials to connect',
        'RDS does not allow public IPs so the instance should never have launched'
      ],
      correct: 2,
      explanation: 'Three critical security rules were violated simultaneously - public subnet, wide open security group, and exposed credentials. All three together made the breach entirely trivial to execute.'
    }
  ]
};

// ── Case Study Question Banks ────────────────────────────────

export const CASE_STUDY_QUESTIONS = {};

