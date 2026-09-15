# AWS Student Builder Group @ VIT Vellore

Welcome to the official web application for the **AWS Student Builder Group at VIT Vellore**. This platform serves as a central hub for our community of cloud architects and student builders mastering AWS infrastructure.

## Community & Socials

- [GitHub](https://github.com/AWS-Student-Builder-Group-VIT)
- [LinkedIn](https://www.linkedin.com/company/aws-student-builder-group-vit)
- [Instagram](https://www.instagram.com/aws.sbg.vit)

---
*Build, Learn, Deploy.*

## Local development

Run `npm install`, then `npm run dev`. This starts the main Vite site, API, and
the recruitment portal together. Open the recruitment portal directly at
`http://localhost:3001/recruitment`, or visit `http://localhost:5173/recruitment`
to be forwarded there.

The recruitment app reads Supabase credentials from `recruitment/.env.local`.
For production, deploy the `recruitment` directory as its own Next.js app and set
`VITE_RECRUITMENT_URL` on the main site to that deployment's `/recruitment` URL.

#RET=...
```

`DATABASE_URL` should point to Neon PostgreSQL. Admin login is disabled when `ADMIN_ID` or `ADMIN_PASSWORD` is missing; credentials are never supplied by the frontend.
