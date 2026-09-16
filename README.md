# PassGo 🎫

PassGo is a community event ticketing platform designed to streamline event discovery, ticket purchasing, and organizer management. Built with modern full-stack architecture, it delivers a fast, responsive user experience for attendees and powerful tools for event hosts.

## Group Members

- Group 10
- Members:
    - Marcelinus Dinoglide Yoga Prakoso
    - Garjita Adicandra
    - Rasyid Rayhan Novandy
    - Debert Jamie Chanderson

## Repository Structure

```
monorepo-passgo/
├── apps/
│   ├── backend/             # Express API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/            # Next.js App
│       ├── src/
│       │   └── app/
│       ├── package.json
│       └── tsconfig.json
├── packages/                # Shared modules
│   └── types/               # Shared TypeScript interfaces/DTOs
├── .gitignore
└── package.json             # Root workspace configuration
```