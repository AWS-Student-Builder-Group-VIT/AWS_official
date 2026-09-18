# AWS Student Builder Group @ VIT Vellore

<div align="center">

<img src="./src/assets/aws_icon.jpeg" alt="AWS Student Builder Group VIT Logo" width="130" style="border-radius: 50%;" />

<br />

![AWS SBG VIT Banner](https://img.shields.io/badge/AWS%20Student%20Builder%20Group-VIT%20Vellore-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Motto](https://img.shields.io/badge/Motto-Learn%20%C2%B7%20Build%20%C2%B7%20Deploy-232F3E?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Official Web Platform of AWS Student Builder Group at Vellore Institute of Technology (VIT), Vellore.**

*Empowering the next generation of cloud architects, developers, and student builders.*

---

### 🌐 Connect with Us
[![GitHub](https://img.shields.io/badge/GitHub-AWS--Student--Builder--Group--VIT-181717?style=flat-square&logo=github)](https://github.com/AWS-Student-Builder-Group-VIT)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-awsbuilder--vit-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/company/awsbuilder-vit/)
[![Instagram](https://img.shields.io/badge/Instagram-@awsbuilder__vit-E4405F?style=flat-square&logo=instagram)](https://www.instagram.com/awsbuilder_vit)

</div>

---

## 📖 About the Club

The **AWS Student Builder Group at VIT Vellore** is a premier student-led technical community dedicated to mastering Amazon Web Services (AWS), cloud architecture, distributed systems, DevOps, and cloud-native software engineering.

> *"Same Passion, Bigger Goals."*  
> We are a collective of driven student builders dedicated to mastering cloud technologies. Our evolution reflects our commitment to not just learning, but designing, building, and deploying robust, scalable, real-world solutions.

### 🎯 Our Mission: *Learn, Build, Deploy*
1. **Learn:** Bridge the gap between academic theory and production cloud engineering through intensive workshops, speaker sessions, and AWS certification pathways.
2. **Build:** Hands-on experience with production services — EC2, S3, IAM, Lambda, DynamoDB, SageMaker, Amazon Bedrock, and VPCs.
3. **Deploy:** Transition student projects from localhost to high-availability global cloud deployments with robust CI/CD, security policies, and scalable architectures.

---

## 🚀 What We Do

### 🛠️ Hands-on Workshops & Bootcamps
- **AWS 101 – The Architecture Sandbox:** Virtualization, hypervisors, VPC networking, routing tables, and security groups.
- **AWS 102 – Cloud Genesis:** Foundations of scalable digital services, AWS global infrastructure, and computing evolution.
- **AWS 103 – The AI Cloud Stack:** Model training & deployment on AWS, SageMaker, EC2, LLMs, and Generative AI prompt engineering.
- **AWS 104 – Data Nexus:** Relational vs. NoSQL databases, storage paradigms, Amazon RDS, and cloud-native data pipelines.
- **AWS Workshop – Cloud Foundations Bootcamp:** Led by industry veterans (e.g., Senior Data Scientists from Amazon) · **POC:** Abhishek Kumar & Nivida · **Venue:** *KAMARAJ AUDITORIUM* — covering IAM roles, S3 bucket security, Amazon Bedrock, and live console labs.

### 🏆 Flagship Hackathons & Competitions
- **HackQuest (AWS Mystery Box Hackathon):** A flagship 24-hour hackathon organized in association with **HDFC Bank** · **POC:** Aesha Singh · **Venue:** *SAROJINI NAIDU AUDITORIUM*. Teams tackle unique surprise problem statements with live chaos twists, cloud point shops, and architectural pitches judged by industry panels.
- **Cloud Combat Quiz Series:** Multi-round competitive cloud quizzes testing speed, core architecture principles, and situational troubleshooting.

### 💡 Community Perks
- **AWS Cloud Credits & Certification Vouchers:** Enabling core builders to build without credit limits and attain official AWS certifications.
- **Direct Industry Access:** Mentorship and interactive sessions with AWS Community Builders, solutions architects, and industry leaders.

----

## 🏛️ Leadership & Core Team

| Role | Name | Focus |
| :--- | :--- | :--- |
| **Chairperson** | **Ankit Subedi** | Club vision, strategy & community leadership |
| **Vice Chairperson** | **Aesha Singh** | Operations, strategic initiatives & growth |
| **Secretary** | **Vidhi Prashant Jain** | Documentation, coordination & communications |
| **Co-Secretary** | **Tanishi Raj** | Administrative logistics & event operations |
| **Design Head** | **Pihu Gupta** | Visual identity, UI/UX & creative direction |
| **Events Head** | **Arshi Saxena** | Large-scale bootcamps, hackathons & timeline execution |
| **Finance Head** | **Ayush Naugariya** | Sponsorships, budgeting & financial governance |
| **Outreach Head** | **Jaanya Bagdi** | Industry partnerships, networking & collaborations |
| **Publicity Head** | **Vivek Kashyap** | Media presence, brand campaigns & campus outreach |
| **Technical Head** | **Abhishek Kumar** | Cloud workshops, technical infrastructure & platform engineering |

---

## 💻 About the Web Application

This repository hosts the official web portal for the AWS Student Builder Group at VIT Vellore.

### Key Features
- **3D Helix Event Timeline:** Interactive 3D carousel tracking flagship bootcamps, speaker sessions, and hackathons.
- **Recruitment & Assessment Portal (`/recruitment`):**
  - Multi-track timed assessments for Technical, Design, Management, and Media domains.
  - **Zero-cost Psychological Deterrent Proctoring:** Webcam monitor, full desktop screen capture, fullscreen lock, and tab-switching strike system.
  - Mobile restriction guardrail ensuring candidates attempt proctored tests on desktop/laptop hardware.
  - Real-time candidate dossier and admin evaluation portal.
- **Technical Blog Engine:** In-depth technical articles on Amazon Bedrock, AWS Lambda serverless computing, and real-time cloud data pipelines.
- **Interactive Mini-Games & Quizzes:** Cloud Combat quiz modules and ASCII cloud games.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, GSAP
- **3D / Visuals:** Three.js, React Three Fiber, Lucide Icons, Tabler Icons
- **Backend & Database:** Node.js, Express, Supabase, Neon PostgreSQL
- **Deployment:** Vercel

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### 2. Clone the Repository
```bash
git clone https://github.com/AWS-Student-Builder-Group-VIT/AWS_official.git
cd AWS_official
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Configuration
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_database_url
```

### 5. Run the Application
```bash
npm run dev
```
- Main Application: `http://localhost:5173`
- Recruitment Portal: `http://localhost:5173/recruitment`

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by the <strong>AWS Student Builder Group at VIT Vellore</strong></sub>
</div>
