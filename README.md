# AWS Student Builder Group @ VIT Vellore

Welcome to the official web application for the **AWS Student Builder Group at VIT Vellore**. This platform serves as a central hub for our community of cloud architects and student builders mastering AWS infrastructure.

## Community & Socials

- [GitHub](https://github.com/AWS-Student-Builder-Group-VIT)
- [LinkedIn](https://www.linkedin.com/company/aws-student-builder-group-vit)
- [Instagram](https://www.instagram.com/aws.sbg.vit)

---
*Build, Learn, Deploy.*

## Local backend configuration

The Mystery Box and team game ledger require these server environment variables:

```env
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
JWT_SECRET=...
ADMIN_ID=...
ADMIN_PASSWORD=...
ADMIN_JWT_SECRET=...
```

`DATABASE_URL` should point to Neon PostgreSQL. Admin login is disabled when `ADMIN_ID` or `ADMIN_PASSWORD` is missing; credentials are never supplied by the frontend.
