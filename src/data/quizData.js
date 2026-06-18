// ═══════════════════════════════════════════════════════════
//  AWS QUIZ DATA — All question banks & case studies
// ═══════════════════════════════════════════════════════════

// ── Regular Quizzes ─────────────────────────────────────────

export const QUIZZES = [
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
