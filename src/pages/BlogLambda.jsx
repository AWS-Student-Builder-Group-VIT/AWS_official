import BlogPostLayout from '../components/BlogPostLayout';
import { Highlighter } from '../components/Highlighter';
import img1 from '../assets/blog-images/lambda/image1.png';
import img2 from '../assets/blog-images/lambda/image2.png';
import img3 from '../assets/blog-images/lambda/image3.png';
import img4 from '../assets/blog-images/lambda/image4.png';
import img5 from '../assets/blog-images/lambda/image5.png';
import img6 from '../assets/blog-images/lambda/image6.png';
import img7 from '../assets/blog-images/lambda/image7.png';

export default function BlogLambda() {
  return (
    <BlogPostLayout slug="aws-lambda">
      <div className="section-label">Introduction</div>
      <p>
        Imagine you own a food stall. You only pay rent when customers show up and buy food. When
        there are no customers, you pay nothing. No rent, no electricity bill, no staff wages. Sounds
        like a dream, right?
      </p>
      <p>
        That is exactly what AWS Lambda does, but for your code.
      </p>
      <p>
        <Highlighter action="highlight" color="rgba(100, 200, 255, 0.35)">
          AWS Lambda is a service from Amazon Web Services that lets you run your code without setting up or managing any servers.
        </Highlighter>{' '}
        You just write your code, upload it, and Lambda takes care
        of everything else. It runs when it needs to, and you only pay for the time it actually runs.
      </p>

      <h2>What is a Server, and Why Do We Want to Avoid It?</h2>
      <div className="section-label"></div>
      <img src={img1} alt="Traditional Server Architecture" className="blog-img" />
      <p>
        Before we understand Lambda, let us quickly understand the problem it solves.
      </p>
      <p>
        Traditionally, when you build a website or an app, you need a server. A server is basically a
        computer that runs 24/7, waiting for someone to use your app. Here is the issue with that:
      </p>
      <ul>
        <li><Highlighter action="underline" color="#FF5252">You pay for the server even when nobody is using your app.</Highlighter></li>
        <li>You have to set it up, maintain it, update it, and fix it when it breaks.</li>
        <li>If your app suddenly gets a lot of users, your server might crash.</li>
      </ul>
      <p>
        AWS Lambda solves all of these problems. No server to set up. No server to manage. You just
        write the code and Lambda handles the rest.
      </p>

      <h2>So How Does AWS Lambda Actually Work?</h2>
      <div className="section-label"></div>
      <img src={img2} alt="How AWS Lambda Works" className="blog-img" />
      <p>
        Think of Lambda like a light switch. When you flip the switch, the light turns on. When you
        flip it off, the light turns off.{' '}
        <Highlighter action="highlight" color="rgba(80, 220, 120, 0.35)">
          You are not paying for electricity when the light is off.
        </Highlighter>
      </p>
      <p><strong>Lambda works the same way:</strong></p>
      <ul>
        <li>Something triggers your code (a button click, a file upload, a timer, etc.)</li>
        <li>Lambda wakes up and runs your code.</li>
        <li>Once the job is done, Lambda goes back to sleep.</li>
        <li><Highlighter action="underline" color="#FF9800">You are charged only for the time your code was actually running.</Highlighter></li>
      </ul>

      <div className="callout-box">
        <p>
          <strong>That tiny moment when your code runs is called a function invocation.</strong> Your
          code in Lambda is called a <strong>Lambda function</strong>.
        </p>
      </div>

      <h2>A Real-Life Example</h2>
      <div className="section-label"></div>
      <img src={img3} alt="Lambda Real-Life Example" className="blog-img" />
      <p>
        Let us say you build a website where users can upload their profile pictures. Every time a
        user uploads a photo, you want to automatically resize it to a smaller thumbnail. Here is how
        you would use Lambda for this:
      </p>
      <ol>
        <li>User uploads a photo to your website.</li>
        <li>The photo goes into AWS S3 (Amazon's file storage service).</li>
        <li>S3 triggers your Lambda function automatically.</li>
        <li>Lambda resizes the image and saves the thumbnail.</li>
        <li>Lambda goes back to sleep, and you are charged only for those few milliseconds.</li>
      </ol>
      <p>
        You did not set up a single server.{' '}
        <Highlighter action="highlight" color="rgba(255, 214, 10, 0.45)">
          You did not worry about what happens if 10,000 users upload photos at the same time. Lambda scales automatically to handle all of them.
        </Highlighter>
      </p>

      <h2>What Can Trigger a Lambda Function?</h2>
      <div className="section-label"></div>
      <img src={img4} alt="Lambda Triggers" className="blog-img" />
      <p>Lambda can be triggered by many different events inside AWS. Here are some common ones:</p>
      <ul>
        <li><strong>API Gateway:</strong> Someone visits a URL or submits a form on your website.</li>
        <li><strong>S3:</strong> A file is uploaded to your storage bucket.</li>
        <li><strong>DynamoDB:</strong> A change happens in your database.</li>
        <li><strong>CloudWatch Events:</strong> A timer goes off (like a cron job).</li>
        <li><strong>SNS / SQS:</strong> A message is sent or queued.</li>
      </ul>

      <h2>What Languages Does Lambda Support?</h2>
      <div className="section-label"></div>
      <p>You can write your Lambda functions in many popular programming languages:</p>
      <ul>
        <li>Python</li>
        <li>JavaScript (Node.js)</li>
        <li>Java</li>
        <li>C# (.NET)</li>
        <li>Go</li>
        <li>Ruby</li>
      </ul>
      <p>So no matter which language you are comfortable with, chances are Lambda supports it.</p>

      <h2>How Much Does It Cost?</h2>
      <div className="section-label"></div>
      <p>
        This is where Lambda really shines. AWS gives you a very generous free tier:
      </p>
      <ul>
        <li><Highlighter action="highlight" color="rgba(100, 200, 255, 0.35)"><strong>1 million</strong> free function calls every single month.</Highlighter></li>
        <li><strong>400,000 GB-seconds</strong> of compute time for free every month.</li>
      </ul>
      <p>
        For most small apps and side projects,{' '}
        <Highlighter action="underline" color="#00C896">
          you will likely never pay a single rupee (or dollar) for Lambda.
        </Highlighter>{' '}
        And even after the free tier, the pricing is extremely low — you pay only for the
        milliseconds your code runs.
      </p>

      <h2>Benefits of Using AWS Lambda</h2>
      <div className="section-label"></div>
      <img src={img5} alt="Benefits of AWS Lambda" className="blog-img" />
      <ul>
        <li><strong>No server management:</strong> AWS handles everything behind the scenes. You just focus on your code.</li>
        <li><strong>Automatic scaling:</strong> <Highlighter action="highlight" color="rgba(255, 214, 10, 0.45)">Whether you have 1 user or 1 million users, Lambda scales instantly.</Highlighter></li>
        <li><strong>Pay only for what you use:</strong> No idle costs. You only pay when your function actually runs.</li>
        <li><strong>Fast to get started:</strong> You can have a Lambda function running in minutes.</li>
        <li><strong>Works well with other AWS services:</strong> Lambda connects easily with S3, DynamoDB, API Gateway, and many more.</li>
      </ul>

      <h2>When Should You NOT Use Lambda?</h2>
      <div className="section-label"></div>
      <img src={img6} alt="Lambda Limitations" className="blog-img" />
      <p>Lambda is great, but it is not always the right tool. Avoid it when:</p>
      <ul>
        <li><Highlighter action="underline" color="#FF5252">Your task takes more than <strong>15 minutes</strong> to complete. Lambda has a maximum timeout of 15 minutes.</Highlighter></li>
        <li>You need to run a constantly active app like a chat server.</li>
        <li>Your code needs a lot of memory or heavy computation for a long time.</li>
      </ul>
      <p>
        For those cases, you would look at services like EC2 or ECS. But for most short, event-driven
        tasks, Lambda is perfect.
      </p>

      <h2>Conclusion</h2>
      <div className="section-label"></div>
      <img src={img7} alt="AWS Lambda Conclusion" className="blog-img" />
      <p>
        <Highlighter action="highlight" color="rgba(180, 120, 255, 0.38)">
          AWS Lambda changed the way developers build and deploy software.
        </Highlighter>{' '}
        Instead of worrying about servers, infrastructure, and scaling, you can focus entirely on writing code that solves problems.
      </p>
      <p>
        If you are just getting started with cloud computing, Lambda is one of the best places to
        begin. It is simple, cheap, powerful, and used by companies of all sizes — from startups to
        Netflix and Airbnb.
      </p>
      <p>
        Give it a try. Sign in to your AWS account, head to the Lambda console, and write your first
        function.{' '}
        <Highlighter action="underline" color="#FF9800">
          You will be amazed at how quickly you can build something useful without ever touching a server.
        </Highlighter>
      </p>
    </BlogPostLayout>
  );
}
