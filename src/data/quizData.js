// ═══════════════════════════════════════════════════════════
//  AWS QUIZ DATA — All question banks & case studies
// ═══════════════════════════════════════════════════════════

// ── Regular Quizzes ─────────────────────────────────────────

export const QUIZZES = [
  {
    id: 'fundamentals',
    title: 'AWS 101: The Architecture SandBox - Round 1',
    subtitle: 'Test your foundational knowledge on virtualisation, OSI model, and basic networking.',
    category: 'Beginner',
    questions: 4,
    duration: '5 min',
    topics: ['Virtualisation', 'OSI Model', 'Networking', 'Ports'],
    color: '#FF9900',
  },
  {
    id: 'advanced',
    title: 'AWS 101: The Architecture SandBox - Round 2',
    subtitle: 'Intermediate networking and virtualisation concepts, including subnets and stateful firewalls.',
    category: 'Intermediate',
    questions: 3,
    duration: '5 min',
    topics: ['Hypervisors', 'Subnets', 'Firewalls'],
    color: '#00a8e0',
  },
  {
    id: 'security',
    title: 'AWS 101: The Architecture SandBox - Round 3',
    subtitle: 'Hard scenarios on security groups, VPC architecture, and troubleshooting.',
    category: 'Advanced',
    questions: 3,
    duration: '5 min',
    topics: ['Security Groups', 'VPC', 'Troubleshooting', 'DNS'],
    color: '#a855f7',
  },
];

export const CASE_STUDIES = [
  {
    id: 'food-delivery',
    title: 'CASE 1: Broken Food App',
    subtitle: 'A startup just launched. Everything worked during testing, but on launch day, systems begin failing one by one. Fix the serverless architecture before the startup crashes.',
    color: '#34d399',
    questions: 4,
    duration: '5m',
    difficulty: 'Hard',
    tags: ['Serverless', 'S3', 'Lambda', 'API Gateway']
  },
  {
    id: 'photo-app',
    title: 'CASE 2: The Failed Photo App',
    subtitle: 'A startup called SnapUp launched. Its serverless photo workflow is failing. Fix the architecture.',
    color: '#f472b6',
    questions: 4,
    duration: '5m',
    difficulty: 'Hard',
    tags: ['S3', 'Lambda', 'SQS', 'Stateless']
  },
  {
    id: 'smart-campus',
    title: 'CASE 3: Smart Campus Crisis',
    subtitle: 'Our university launches a smart campus app. Attendance, notifications, assignments, event reminders. The serverless backend starts failing.',
    color: '#60a5fa',
    questions: 4,
    duration: '5m',
    difficulty: 'Hard',
    tags: ['EventBridge', 'Lambda', 'SNS']
  }
];

// ── Question Banks ───────────────────────────────────────────

export const QUESTION_BANKS = {
  fundamentals: [
    {
      id: 1, category: 'Virtualisation',
      question: 'Before virtualisation, a single physical server typically ran one OS and one workload. What was the approximate CPU utilisation in that scenario?',
      options: ['~10% used, 90% wasted', '~50% used, 50% wasted', '~90% used, 10% wasted', '~30% used, 70% wasted'],
      correct: 0,
      explanation: 'Before virtualisation, CPU utilisation was ~10% used with 90% wasted — the core inefficiency that virtualisation was designed to solve.'
    },
    {
      id: 2, category: 'Hypervisors',
      question: 'Which of the following correctly describes a Type 1 (bare-metal) hypervisor?',
      options: ['Runs on top of an existing host OS - ideal for developer laptops', 'Installed directly on physical hardware with no host OS required', 'Used primarily by students running VirtualBox', 'Has higher performance overhead due to the host OS layer'],
      correct: 1,
      explanation: 'Type 1 hypervisors (VMware ESXi, Hyper-V, Xen) install directly on hardware with no host OS, giving them direct hardware access and stronger security. AWS, Azure, and Google Cloud all use Type 1.'
    },
    {
      id: 3, category: 'OSI Model',
      question: 'In the OSI model, at which layer do switches primarily operate?',
      options: ['Layer 1 — Physical', 'Layer 2 — Data Link', 'Layer 3 — Network', 'Layer 4 — Transport'],
      correct: 1,
      explanation: 'Switches operate at Layer 2 (Data Link), forwarding frames based on MAC addresses. Routers operate at Layer 3 (Network) using IP addresses.'
    },
    {
      id: 4, category: 'Ports',
      question: 'Which port number is associated with SSH (Secure Shell)?',
      options: ['Port 80', 'Port 443', 'Port 22', 'Port 25'],
      correct: 2,
      explanation: 'Port 22 = SSH, Port 80 = HTTP, Port 443 = HTTPS.'
    }
  ],

  advanced: [
    {
      id: 1, category: 'Virtualisation',
      question: 'A developer\'s laptop runs VirtualBox with three VMs - Ubuntu, Windows 10, and Kali Linux, all at the same time. What type of virtualisation setup is this, and what is the performance implication?',
      options: ['Type 1 bare-metal - maximum performance, no overhead', 'Type 2 hosted - slight performance overhead due to the host OS layer', 'Type 2 hosted - eliminates the need for a host OS entirely', 'Type 1 bare-metal - used because the developer needs cloud-level performance'],
      correct: 1,
      explanation: 'VirtualBox is a Type 2 (hosted) hypervisor that runs on top of the laptop\'s existing OS, adding a performance overhead layer. Type 1 runs directly on hardware and is used by cloud providers, not dev machines.'
    },
    {
      id: 2, category: 'Networking',
      question: 'Server A has IP 192.168.1.10 and Server B has IP 192.168.2.10. Both are on the same physical network. Can Server A reach Server B directly, or does it require an intermediate device?',
      options: ['Yes - they are on the same physical network, so the switch routes them directly', 'No - they are in different subnets, so a router hop is required', 'Yes - both IPs are in the 192.168.x.x range, so they share the same subnet', 'No - different subnets cannot communicate even with a router'],
      correct: 1,
      explanation: '192.168.1.x and 192.168.2.x are different subnets. Devices in different subnets require a router hop — switches only handle same-subnet traffic. Physical proximity doesn\'t matter; the IP subnet boundary does.'
    },
    {
      id: 3, category: 'Firewalls',
      question: 'A firewall is configured with stateful inspection. A user initiates a web request to a server. Which best describes what stateful inspection adds over a simple packet filter?',
      options: ['It blocks all inbound traffic regardless of whether a request was made', 'It only checks the destination IP of each packet in isolation', 'It tracks the session state, so return traffic from the server is automatically allowed because the session was initiated by the user', 'It encrypts all traffic passing through the network perimeter'],
      correct: 2,
      explanation: 'Stateful inspection tracks active sessions - when you initiate a request, the firewall remembers the session and automatically allows the server\'s response back in. A basic packet filter checks each packet in isolation without any session context.'
    }
  ],

  security: [
    {
      id: 1, category: 'Security Groups',
      question: 'Users can open your company\'s website (HTTPS works) but cannot SSH into the EC2 server for maintenance. The EC2 security group is the only thing that changed recently. What is the most likely cause?',
      options: ['Port 443 was accidentally blocked, preventing HTTPS traffic', 'The hypervisor on the host machine failed, bringing the VM down', 'Port 22 inbound rule was removed from the security group, blocking SSH', 'The subnet routing table lost its default gateway entry'],
      correct: 2,
      explanation: 'SSH uses Port 22 and HTTPS uses Port 443. Since HTTPS still works, the VM is running fine -ruling out hypervisor failure. The security group change most likely removed the Port 22 inbound rule, blocking only SSH.'
    },
    {
      id: 2, category: 'VPC Architecture',
      question: 'A startup wants their database servers completely unreachable from the internet but still accessible by their application servers. Which combination of concepts achieves this?',
      options: ['Put everything in one public subnet - firewalls will protect the database', 'Place app servers in a public subnet and database servers in a private subnet, connected via a router and block inbound internet traffic to the private subnet at the firewall', 'Use a Type 2 hypervisor on the database VM so it has a host OS layer protecting it', 'Assign the database server a MAC address that the switch won\'t forward to the internet gateway'],
      correct: 1,
      explanation: 'This is the classic public/private subnet pattern. App servers in a public subnet receive internet traffic; database servers in a private subnet are only reachable via the internal router. The firewall blocks all inbound internet traffic to the private subnet.'
    },
    {
      id: 3, category: 'Troubleshooting',
      question: 'Users can ping a server by IP address but cannot reach it by domain name (e.g., app.company.com). Using the OSI model, which layer should the engineer investigate first and why?',
      options: ['Layer 1 (Physical) — the cable must be faulty since nothing works', 'Layer 3 (Network) — IP routing is broken, causing name resolution to fail', 'Layer 2 (Data Link) — the MAC address table needs to be flushed', 'Layer 7 (Application) — DNS is an application-layer protocol; name resolution is failing while IP routing is fine'],
      correct: 3,
      explanation: 'Ping works by IP, so Layers 1, 2, and 3 are all fine. The failure is specifically domain name resolution - DNS operates at Layer 7 (Application).'
    }
  ]
};

// ── Case Study Question Banks ────────────────────────────────

export const CASE_STUDY_QUESTIONS = {
  'food-delivery': {
    scenario: 'A startup, GoodFoods, just launched. Everything worked during testing, but on launch day, systems begin failing one by one. Escape the rooms by fixing the serverless architecture before the startup crashes.',
    questions: [
      {
        question: 'ROOM 1: Users upload restaurant menu images, but nothing happens after upload. No image compression. No processing. The Lambda function exists. What is the most likely issue?',
        options: [
          'Lambda memory too low',
          'No S3 trigger configured',
          'API Gateway timeout',
          'Wrong database'
        ],
        correct: 1,
        explanation: 'If the Lambda exists but doesn\'t run, the trigger (event source mapping) connecting S3 to Lambda is missing.',
        category: 'ROOM 1'
      },
      {
        question: 'ROOM 2: Users submit food orders and Lambda processes payment validation. But it says - "Request timed out". Execution logs show: Function keeps getting terminated. What is the likely issue?',
        options: [
          'Lambda timeout exceeded',
          'Wrong IAM role',
          'Missing API Gateway',
          'Wrong runtime language'
        ],
        correct: 0,
        explanation: 'Lambda functions have a configurable timeout (default 3 seconds, up to 15 mins). If payment processing takes longer than the configured timeout, the function is terminated.',
        category: 'ROOM 2'
      },
      {
        question: 'ROOM 3: A food festival goes viral and 10,000+ users hit the app. Team panics, expecting servers to crash. Why is Lambda suitable here?',
        options: [
          'It provides unlimited database storage',
          'It handles automatic scaling and event-driven burst handling',
          'It guarantees zero latency for all requests',
          'It uses physical hardware instead of virtualized resources'
        ],
        correct: 1,
        explanation: 'Lambda automatically scales by spawning concurrent executions to handle sudden bursts of event-driven traffic.',
        category: 'ROOM 3'
      },
      {
        question: 'ROOM 4: Users report: First request is slow. Later requests are fast. What explains this?',
        options: [
          'Database lag',
          'Cold start latency',
          'IAM delay',
          'Broken trigger'
        ],
        correct: 1,
        explanation: 'When a Lambda function has not been used recently, AWS needs to initialize a new execution environment. This initial delay is known as a cold start.',
        category: 'ROOM 4'
      }
    ]
  },
  'photo-app': {
    scenario: 'A startup called SnapUp launched. Its serverless photo workflow is failing. Escape the rooms by fixing the architecture.',
    questions: [
      {
        question: 'ROOM 1: Users upload photos. Nothing happens. Which AWS service should trigger Lambda?',
        options: [
          'S3',
          'EC2',
          'CloudFront',
          'IAM'
        ],
        correct: 0,
        explanation: 'S3 Event Notifications can automatically trigger Lambda functions when new objects (like photos) are uploaded.',
        category: 'ROOM 1'
      },
      {
        question: 'ROOM 2: The team uses Lambda for 2-hour video rendering. Everything fails. Why?',
        options: [
          'Lambda does not support video processing',
          'Lambda max execution time limitation',
          'Lambda cannot access S3 for large files',
          'S3 cannot trigger Lambda for video files'
        ],
        correct: 1,
        explanation: 'Lambda has a hard maximum execution time limit of 15 minutes. A 2-hour task will always be terminated prematurely.',
        category: 'ROOM 2'
      },
      {
        question: 'ROOM 3: Users expect Lambda to remember previous photo edits. But each execution behaves like a fresh start. Why?',
        options: [
          'Lambda requires a custom IAM role to save state',
          'The Lambda memory setting is too low',
          'Lambda is stateless',
          'They used the wrong programming language'
        ],
        correct: 2,
        explanation: 'Lambda functions are inherently stateless. Each invocation runs in a fresh or reused container, so state must be stored externally (e.g., in DynamoDB).',
        category: 'ROOM 3'
      },
      {
        question: 'ROOM 4: A Lambda function executes whenever a message is added to a queue for background processing. Which service most likely triggered it?',
        options: [
          'SQS',
          'S3',
          'RDS',
          'CloudFormation'
        ],
        correct: 0,
        explanation: 'Amazon SQS (Simple Queue Service) is used for message queuing and natively integrates as an event source for Lambda.',
        category: 'ROOM 4'
      }
    ]
  },
  'smart-campus': {
    scenario: 'Our university launches a smart campus app. Attendance, notifications, assignments, event reminders. The serverless backend starts failing.',
    questions: [
      {
        question: 'ROOM 1: Daily reminder emails never send. Which trigger should invoke Lambda every day?',
        options: [
          'API Gateway',
          'EventBridge (CloudWatch Events)',
          'EC2',
          'DynamoDB'
        ],
        correct: 1,
        explanation: 'Amazon EventBridge allows you to create schedule-based rules (like cron jobs) to trigger Lambda functions automatically.',
        category: 'ROOM 1'
      },
      {
        question: 'ROOM 2: Attendance reports crash. Reason: Memory exhausted. What happened?',
        options: [
          'Lambda memory allocation insufficient',
          'EC2 instance ran out of RAM',
          'DynamoDB exceeded write capacity',
          'The database was too large to process'
        ],
        correct: 0,
        explanation: 'Lambda allows you to configure the amount of memory allocated to your function. If your code requires more memory to process large reports, it will crash with an out of memory error.',
        category: 'ROOM 2'
      },
      {
        question: 'ROOM 3: Students submit assignments and need an instant confirmation email. Arrange the following in the correct order: Frontend, Lambda, SNS, S3.',
        options: [
          'Frontend → SNS → Lambda',
          'Frontend → S3 → SNS',
          'Frontend → Lambda → SNS',
          'Lambda → SNS → Frontend'
        ],
        correct: 2,
        explanation: 'The frontend hits a serverless API (via API Gateway to Lambda). The Lambda function processes the submission and publishes a message to SNS, which delivers the email.',
        category: 'ROOM 3'
      },
      {
        question: 'ROOM 4: Team deployed an always-running EC2 instance just for tiny event-driven notifications. Why is this inefficient?',
        options: [
          'EC2 cannot send notifications',
          'Lambda is more cost-efficient for event-driven workloads',
          'EC2 instances cannot connect to SNS',
          'EC2 does not support event-driven code'
        ],
        correct: 1,
        explanation: 'An always-on EC2 instance incurs charges 24/7 even when idle. Lambda is purely pay-per-execution, making it significantly cheaper for sparse, event-driven tasks.',
        category: 'ROOM 4'
      }
    ]
  }
};
