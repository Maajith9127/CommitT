# Accountability & Credibility System

A simple, structured way to commit to actions, hold yourself accountable, and build credible proof of follow-through — with real stakes involved.

## Overview

This system allows users to assign tasks to themselves or receive tasks from others, optionally attach a financial or reputation stake, and face clear consequences based on the outcome:

- ✅ **Task Completed:**  
  The stake is returned.

- ❌ **Task Not Completed:**  
  The stake is lost and can be:  
  - Donated to a cause or charity  
  - Given to the assigner  
  - Held in a designated accountability pool

## Main Processes

- **Task Creation:**  
  Users clearly define what they intend to do, including goals, deadlines, and expectations.

- **Task Assignment:**  
  Tasks are assigned either to oneself or to other users for accountability.

- **Monitoring / Verification:**  
  AI or designated witnesses confirm whether the task was genuinely completed.

- **Staking / Commitment:**  
  Users can optionally put reputation points, tokens, or financial stakes at risk to strengthen accountability.

- **Reputation Scoring:**  
  Users’ credibility scores are updated based on completed and verified tasks.

- **Payout / Reward:**  
  Successful task completion leads to rewards, recognition, or other agreed-upon benefits.

- **Profile & History:**  
  Users maintain a transparent record of all tasks, verifications, stake outcomes, reputation changes, and accomplishments over time.

---

## 🚀 Getting Started

First, install the dependencies:

```bash
bun install
```

## ⚙️ Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
Your app will connect to the Convex cloud backend automatically.

## 📁 Project Structure

```
mono/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── backend/     # Convex backend functions and schema
```

## 📜 Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:setup`: Setup and configure your Convex project
- `bun check-types`: Check TypeScript types across all apps
- `bun dev:native`: Start the React Native/Expo development server

---

## 🌟 Philosophy

Accountability should be **voluntary**, **real**, and **transparent**.
A stake makes commitment meaningful.
A record makes credibility visible.

This isn't just about money — it's about building a **culture of follow-through**.
