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

export const CASE_STUDIES = [];

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

export const CASE_STUDY_QUESTIONS = {};
