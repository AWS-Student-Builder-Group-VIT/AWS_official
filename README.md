# AWS Student Builder Group @ VIT Vellore

Welcome to the official web application for the **AWS Student Builder Group at VIT Vellore**. This platform serves as a central hub for our community of cloud architects and student builders mastering AWS infrastructure.

## Community & Socials

- [GitHub](https://github.com/AWS-Student-Builder-Group-VIT)
- [LinkedIn](https://www.linkedin.com/company/awsbuilder-vit/)
- [Instagram](https://www.instagram.com/awsbuilder_vit)

---
*Learn, Build, Deploy.*

## Local development

Run `npm install`, then `npm run dev`. This starts the main Vite site, API, and
the recruitment portal together. Open the recruitment portal directly at
`http://localhost:3001/recruitment`, or visit `http://localhost:5173/recruitment`
to be forwarded there.

All local applications read configuration from the single `.env.local` file at
the repository root. Do not create a second `recruitment/.env.local`; the
recruitment Next.js configuration loads the workspace-level file automatically.

For production, deploy the `recruitment` directory as its own Next.js app. Each
Vercel project must still receive its required environment variables in the
Vercel dashboard because local `.env.local` files are not deployed. Set
`VITE_RECRUITMENT_URL` on the main site to the recruitment deployment's
`/recruitment` URL.

#RET=...
```

`DATABASE_URL` should point to Neon PostgreSQL. Admin login is disabled when `ADMIN_ID` or `ADMIN_PASSWORD` is missing; credentials are never supplied by the frontend.
