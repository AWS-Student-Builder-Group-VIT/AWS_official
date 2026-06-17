// ═══════════════════════════════════════════════════════════
//  AWS QUIZ DATA — All question banks & case studies
// ═══════════════════════════════════════════════════════════

// ── Regular Quizzes ─────────────────────────────────────────

export const QUIZZES = [
  {
    id: 'fundamentals',
    title: 'AWS 102 : Cloud Combat 2.0 - Round 1',
    subtitle: 'Test your foundational knowledge of IAM, S3, RDS, and Availability Zones.',
    category: 'Beginner',
    questions: 4,
    duration: '5 min',
    topics: ['IAM', 'S3', 'Availability Zones', 'RDS'],
    color: '#FF9900',
  },
  {
    id: 'advanced',
    title: 'AWS 102 : Cloud Combat 2.0 - Round 2',
    subtitle: 'Intermediate concepts including Serverless, S3 Lifecycle Policies, and CloudTrail.',
    category: 'Intermediate',
    questions: 3,
    duration: '5 min',
    topics: ['Serverless', 'S3 Lifecycle', 'CloudTrail'],
    color: '#00a8e0',
  },
  {
    id: 'security',
    title: 'AWS 102 : Cloud Combat 2.0 - Round 3',
    subtitle: 'Hard scenarios on Auto Scaling, IAM Roles for EC2, and Gen AI architecture.',
    category: 'Advanced',
    questions: 3,
    duration: '5 min',
    topics: ['Auto Scaling', 'IAM Roles', 'Gen AI'],
    color: '#a855f7',
  },
];

export const CASE_STUDIES = [];

// ── Question Banks ───────────────────────────────────────────

export const QUESTION_BANKS = {
  fundamentals: [
    {
      id: 1, category: 'IAM',
      question: 'What does IAM stand for in AWS?',
      options: ['Internet Access Management', 'Identity and Access Management', 'Internal Application Monitor', 'Infrastructure and Access Model'],
      correct: 1,
      explanation: 'IAM stands for Identity and Access Management. It enables you to manage access to AWS services and resources securely.'
    },
    {
      id: 2, category: 'Storage',
      question: 'Which AWS service is used to store and retrieve any amount of data as objects in the cloud?',
      options: ['EC2', 'RDS', 'S3', 'Lambda'],
      correct: 2,
      explanation: 'Amazon S3 (Simple Storage Service) is an object storage service that offers industry-leading scalability, data availability, security, and performance.'
    },
    {
      id: 3, category: 'Global Infrastructure',
      question: 'What are AWS Availability Zones?',
      options: ['Different pricing tiers for AWS services', 'Isolated locations within an AWS Region containing one or more data centers', 'Global content delivery network endpoints', 'Virtual private networks within AWS'],
      correct: 1,
      explanation: 'Availability Zones are isolated locations within a region, consisting of one or more discrete data centers, with redundant power, networking, and connectivity.'
    },
    {
      id: 4, category: 'Database',
      question: 'Which AWS service would you use to run a relational database without managing the underlying server infrastructure?',
      options: ['EC2', 'DynamoDB', 'S3', 'RDS'],
      correct: 3,
      explanation: 'Amazon RDS (Relational Database Service) makes it easy to set up, operate, and scale a relational database in the cloud, handling administrative tasks.'
    }
  ],

  advanced: [
    {
      id: 1, category: 'Serverless',
      question: 'A developer needs a backend function that runs only when triggered by an HTTP request and should not require managing any servers. Which combination of AWS services best fits this need?',
      options: ['EC2 + RDS', 'Lambda + API Gateway', 'ECS + CloudWatch', 'S3 + CloudFront'],
      correct: 1,
      explanation: 'AWS Lambda is a serverless compute service, and API Gateway can route HTTP requests to trigger Lambda functions, requiring no server management.'
    },
    {
      id: 2, category: 'Storage Optimization',
      question: 'Your company stores important data in S3 that is accessed frequently for the first 30 days, rarely for the next 60 days, and almost never after that. Which approach best optimizes storage costs?',
      options: ['Store everything in S3 Standard permanently', 'Manually move files to Glacier every month', 'Use S3 Lifecycle Policies to transition objects through storage classes automatically', 'Use EBS volumes instead of S3 for better cost control'],
      correct: 2,
      explanation: 'S3 Lifecycle Policies allow you to automate the transition of objects to more cost-effective storage classes based on access patterns and age.'
    },
    {
      id: 3, category: 'Auditing',
      question: 'Which AWS service would you use to automatically track and log all API calls made in your AWS account for security and compliance auditing?',
      options: ['CloudWatch', 'CloudTrail', 'AWS Config', 'Amazon GuardDuty'],
      correct: 1,
      explanation: 'AWS CloudTrail monitors and logs account activity across your AWS infrastructure, including actions taken through the AWS Management Console, SDKs, and command line tools.'
    }
  ],

  security: [
    {
      id: 1, category: 'Auto Scaling',
      question: 'A startup is building a food delivery app. During lunch and dinner hours, traffic spikes 5x compared to off-peak hours. They want to minimize costs while ensuring the app never goes down under load. Which architecture best addresses this?',
      options: ['One large EC2 instance that handles peak load at all times', 'An Auto Scaling Group of EC2 instances behind an Elastic Load Balancer, scaling based on CPU or request metrics', 'Multiple S3 buckets distributed across regions', 'A single Lambda function with RDS handling all database queries'],
      correct: 1,
      explanation: 'An Auto Scaling Group automatically adjusts the number of EC2 instances to handle load spikes and scales down to minimize costs during off-peak hours, while ELB distributes incoming traffic.'
    },
    {
      id: 2, category: 'IAM & Security',
      question: 'A security audit reveals that several EC2 instances in your company are accessing an S3 bucket using hardcoded AWS access keys embedded in the application code. What is the most secure and AWS-recommended fix?',
      options: ['Encrypt the hardcoded keys using KMS before embedding them', 'Store the keys in an environment variable on the EC2 instance', 'Assign an IAM Role to the EC2 instances with the necessary S3 permissions, eliminating the need for hardcoded keys', 'Create a separate IAM User per instance and rotate keys monthly'],
      correct: 2,
      explanation: 'Assigning an IAM Role to an EC2 instance provides temporary, automatically rotated credentials, eliminating the risk of hardcoded or exposed long-term access keys.'
    },
    {
      id: 3, category: 'Generative AI',
      question: 'Your team is building a generative AI chatbot on AWS. The chatbot needs to access a pre-trained foundation model, retrieve answers from your company\'s internal knowledge base, and log all interactions for monitoring. Which combination of AWS services best supports this architecture?',
      options: ['SageMaker + EC2 + S3', 'Amazon Bedrock + Amazon Q + CloudWatch', 'Rekognition + Comprehend + CloudTrail', 'Lambda + DynamoDB + CodePipeline'],
      correct: 1,
      explanation: 'Amazon Bedrock provides access to foundation models, Amazon Q is an enterprise GenAI assistant for knowledge base retrieval, and CloudWatch logs interactions for monitoring.'
    }
  ]
};

// ── Case Study Question Banks ────────────────────────────────

export const CASE_STUDY_QUESTIONS = {};
