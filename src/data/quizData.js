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
  {
    id: 'ml_easy',
    title: 'Machine Learning - Round 1 (Easy)',
    subtitle: 'Basic AWS Concepts for Machine Learning.',
    category: 'Beginner',
    questions: 4,
    duration: '5 min',
    topics: ['EC2', 'S3', 'Flask', 'SageMaker'],
    color: '#10b981',
  },
  {
    id: 'ml_medium',
    title: 'Machine Learning - Round 2 (Medium)',
    subtitle: 'Deployment & Service Integration.',
    category: 'Intermediate',
    questions: 4,
    duration: '5 min',
    topics: ['S3', 'EC2', 'SageMaker'],
    color: '#3b82f6',
  },
  {
    id: 'ml_hard',
    title: 'Machine Learning - Round 3 (Hard)',
    subtitle: 'Scenario-Based Questions.',
    category: 'Advanced',
    questions: 4,
    duration: '5 min',
    topics: ['EC2', 'Security Groups', 'Pipelines', 'IAM Roles'],
    color: '#f43f5e',
  },
  {
    id: 'genai_easy',
    title: 'Generative AI - Round 1 (Easy)',
    subtitle: 'Basic Concepts of Generative AI.',
    category: 'Beginner',
    questions: 4,
    duration: '5 min',
    topics: ['GPT', 'Polly', 'Comprehend', 'AI'],
    color: '#10b981',
  },
  {
    id: 'genai_medium',
    title: 'Generative AI - Round 2 (Medium)',
    subtitle: 'Applied Knowledge in Generative AI.',
    category: 'Intermediate',
    questions: 4,
    duration: '5 min',
    topics: ['Hallucination', 'RAG', 'SageMaker', 'Transcribe'],
    color: '#3b82f6',
  },
  {
    id: 'genai_hard',
    title: 'Generative AI - Round 3 (Hard)',
    subtitle: 'Deep Dive into Generative AI.',
    category: 'Advanced',
    questions: 4,
    duration: '5 min',
    topics: ['Transformers', 'Prompting', 'Fine-tuning', 'Temperature'],
    color: '#f43f5e',
  }
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
  ],

  ml_easy: [
    {
      id: 1, category: 'Basic AWS Concepts',
      question: 'What is the primary purpose of an EC2 instance?',
      options: ['Store files permanently', 'Run virtual servers in the cloud', 'Train ML models automatically', 'Manage databases'],
      correct: 1,
      explanation: 'EC2 provides virtual servers that can run applications, websites, APIs, and ML workloads.'
    },
    {
      id: 2, category: 'Basic AWS Concepts',
      question: 'What is Amazon S3 mainly used for?',
      options: ['Running Flask applications', 'File and Object Storage', 'Managing IAM users', 'Creating VPCs'],
      correct: 1,
      explanation: 'Amazon S3 is an object storage service used for storing files, datasets, images, backups, and model artifacts.'
    },
    {
      id: 3, category: 'Basic AWS Concepts',
      question: 'Which command is commonly used to start a Flask application?',
      options: ['flask run', 'flask start', 'aws flask run', 'python deploy.py'],
      correct: 0,
      explanation: 'flask run starts the Flask development server.'
    },
    {
      id: 4, category: 'Basic AWS Concepts',
      question: 'What is a SageMaker Notebook Instance?',
      options: ['Managed Jupyter Notebook Environment', 'Database Service', 'Storage Service', 'Networking Service'],
      correct: 0,
      explanation: 'SageMaker Notebook Instances provide managed Jupyter notebooks for data science and ML tasks.'
    }
  ],

  ml_medium: [
    {
      id: 1, category: 'Deployment & Service Integration',
      question: 'Why is Amazon S3 commonly used with SageMaker?',
      options: ['To store training data and model artifacts', 'To create security groups', 'To manage users', 'To launch EC2 instances'],
      correct: 0,
      explanation: 'S3 stores datasets used for training and trained models generated by SageMaker.'
    },
    {
      id: 2, category: 'Deployment & Service Integration',
      question: 'Which component allows users to access a Flask app hosted on EC2?',
      options: ['Security Group + Public IP', 'IAM User', 'CloudWatch', 'S3 Bucket'],
      correct: 0,
      explanation: 'The Security Group must allow inbound traffic and the EC2 instance must have a Public IP.'
    },
    {
      id: 3, category: 'Deployment & Service Integration',
      question: 'After training a model in SageMaker, where is the trained model typically stored?',
      options: ['Route 53', 'Amazon S3', 'CloudFront', 'IAM'],
      correct: 1,
      explanation: 'Trained model artifacts are generally stored in S3 for deployment and reuse.'
    },
    {
      id: 4, category: 'Deployment & Service Integration',
      question: 'Why would you deploy a Flask application on EC2?',
      options: ['To make it accessible over the internet', 'To create datasets', 'To manage S3 buckets', 'To create IAM roles'],
      correct: 0,
      explanation: 'Hosting Flask on EC2 allows users to access the application through a browser or API calls.'
    }
  ],

  ml_hard: [
    {
      id: 1, category: 'Scenario-Based Questions',
      question: 'A data scientist stores training data in S3 and trains a model using SageMaker. Where should the prediction API be deployed?',
      options: ['Amazon S3', 'Amazon EC2', 'IAM', 'Route 53'],
      correct: 1,
      explanation: 'The trained model can be loaded into a Flask API running on EC2 to serve predictions.'
    },
    {
      id: 2, category: 'Scenario-Based Questions',
      question: 'You deployed a Flask app on EC2, but users cannot access it using the public IP. What is the MOST likely reason?',
      options: ['The EC2 instance has too much RAM', 'Security Group does not allow inbound traffic on the application port', 'S3 bucket is empty', 'IAM user has administrator access'],
      correct: 1,
      explanation: 'The most common issue is that the Security Group is not allowing traffic on ports such as 5000, 80, or 443.'
    },
    {
      id: 3, category: 'Scenario-Based Questions',
      question: 'Which workflow correctly represents a Machine Learning deployment pipeline on AWS?',
      options: ['EC2 → S3 → SageMaker', 'S3 → SageMaker → EC2', 'SageMaker → IAM → Route 53', 'S3 → IAM → CloudWatch'],
      correct: 1,
      explanation: 'Data is stored in S3, training happens in SageMaker, and deployment can be done on EC2.'
    },
    {
      id: 4, category: 'Scenario-Based Questions',
      question: 'A Flask application running on EC2 needs to download a model stored in S3. What is the BEST AWS practice?',
      options: ['Make the S3 bucket public', 'Attach an IAM Role to the EC2 instance with S3 access permissions', 'Share AWS root credentials', 'Disable bucket security'],
      correct: 1,
      explanation: 'Using IAM Roles is the secure and recommended method for allowing EC2 to access S3 resources.'
    }
  ],

  genai_easy: [
    {
      id: 1, category: 'Basic Concepts',
      question: 'What does GPT stand for?',
      options: ['General Purpose Technology', 'Generative Pre-trained Transformer', 'Google\'s Processing Toolkit', 'Gradient Propagation Training'],
      correct: 1,
      explanation: 'GPT = Generative Pre-trained Transformer. Introduced by OpenAI, the \'pre-trained\' part means it learned from huge amounts of text BEFORE being fine-tuned for specific tasks.'
    },
    {
      id: 2, category: 'Basic Concepts',
      question: 'Amazon Polly is primarily used for what?',
      options: ['Object detection in images', 'Converting text into speech', 'Detecting language in documents', 'Real-time video analysis'],
      correct: 1,
      explanation: 'Amazon Polly = Text-to-Speech service. It has 90+ voices in 30+ languages, supports Neural TTS for near-human quality, and can output MP3 / OGG streams.'
    },
    {
      id: 3, category: 'Basic Concepts',
      question: 'Which AWS service analyzes the sentiment of text — e.g., customer reviews?',
      options: ['Amazon Rekognition', 'Amazon Polly', 'Amazon Comprehend', 'Amazon Transcribe'],
      correct: 2,
      explanation: 'Amazon Comprehend is AWS\'s NLP service. It detects sentiment (positive/negative/neutral/mixed), extracts entities, key phrases, and more — no ML skills needed.'
    },
    {
      id: 4, category: 'Basic Concepts',
      question: 'What does AI stand for?',
      options: ['Automated Intelligence', 'Assisted Integration', 'Artificial Intelligence', 'Analytical Interface'],
      correct: 2,
      explanation: 'Artificial Intelligence refers to the simulation of human intelligence in machines programmed to think, learn, and solve problems. It is the broad field that includes machine learning, deep learning, and generative AI.'
    }
  ],

  genai_medium: [
    {
      id: 1, category: 'Applied Knowledge',
      question: 'What is \'hallucination\' in the context of LLMs?',
      options: ['When the GPU overheats', 'Generating confident but factually wrong outputs', 'When the model refuses to respond', 'A type of training data augmentation'],
      correct: 1,
      explanation: 'Hallucination = LLMs predicting \'plausible-sounding\' text that happens to be false. They\'re optimized for coherence, not factual accuracy. Always verify critical outputs!'
    },
    {
      id: 2, category: 'Applied Knowledge',
      question: 'What does RAG stand for in modern AI systems?',
      options: ['Rapid Attention Generation', 'Retrieval Augmented Generation', 'Recursive Automated Generation', 'Real-time AI Gateway'],
      correct: 1,
      explanation: 'RAG = Retrieval Augmented Generation. Instead of retraining a model, you feed it relevant documents at query time so it can answer based on YOUR data. It\'s how most enterprise AI is built.'
    },
    {
      id: 3, category: 'Applied Knowledge',
      question: 'Which AWS service is used to build, train, and deploy machine learning models at scale?',
      options: ['AWS Lambda', 'Amazon Lex', 'Amazon SageMaker', 'AWS Glue'],
      correct: 2,
      explanation: 'Amazon SageMaker is AWS\'s fully managed ML platform. It provides tools for data labeling, model training, hyperparameter tuning, and one-click deployment — all in one place, without managing infrastructure.'
    },
    {
      id: 4, category: 'Applied Knowledge',
      question: 'Which AWS service converts spoken language into text?',
      options: ['Amazon Polly', 'Amazon Comprehend', 'Amazon Rekognition', 'Amazon Transcribe'],
      correct: 3,
      explanation: 'Amazon Transcribe is AWS\'s automatic speech recognition (ASR) service. It converts audio and video speech into accurate text, supports multiple languages, and can identify different speakers in a conversation.'
    }
  ],

  genai_hard: [
    {
      id: 1, category: 'Deep Dive',
      question: 'Which paper introduced the Transformer architecture that powers ALL modern LLMs?',
      options: ['Deep Learning (LeCun, 2015)', 'BERT: Pre-training of Deep Transformers (2018)', 'Attention Is All You Need (Google, 2017)', 'Generative Adversarial Networks (Goodfellow, 2014)'],
      correct: 2,
      explanation: '"Attention Is All You Need" (Vaswani et al., Google, 2017) introduced the Transformer. It replaced RNNs with self-attention, enabling parallel training and much better context understanding.'
    },
    {
      id: 2, category: 'Deep Dive',
      question: 'Which prompting technique explicitly asks the model to \'think step by step\'?',
      options: ['Zero-shot prompting', 'Few-shot prompting', 'Chain-of-Thought (CoT) prompting', 'Role prompting'],
      correct: 2,
      explanation: 'Chain-of-Thought prompting asks the model to reason through problems step by step before giving the final answer. Dramatically reduces errors on math, logic, and multi-step tasks.'
    },
    {
      id: 3, category: 'Deep Dive',
      question: 'What is the purpose of "fine-tuning" a pre-trained LLM?',
      options: ['To compress the model size', 'To adapt the model to a specific task using additional training data', 'To remove hallucinations permanently', 'To increase the number of parameters'],
      correct: 1,
      explanation: 'Fine-tuning takes a pre-trained model and trains it further on a smaller, task-specific dataset. This adapts the model\'s behavior for specific use cases like customer support, medical diagnosis, or legal document analysis — without training from scratch.'
    },
    {
      id: 4, category: 'Deep Dive',
      question: 'In the context of LLMs, what does "temperature" control?',
      options: ['The processing speed of the GPU', 'The maximum token length of a response', 'The randomness and creativity of the model\'s output', 'The number of layers in the neural network'],
      correct: 2,
      explanation: 'Temperature is a parameter that controls how random or deterministic the model\'s output is. A low temperature (e.g. 0.1) makes responses more focused and predictable. A high temperature (e.g. 0.9) makes them more creative and varied — useful for brainstorming but risky for factual tasks.'
    }
  ]
};

// ── Case Study Question Banks ────────────────────────────────

export const CASE_STUDY_QUESTIONS = {};
