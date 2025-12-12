# Runiverse - Fitness isn’t just personal, it’s territorial warfare.  

A mobile-first **fitness gamification platform** where users can **walk to claim territories**, complete **dynamic tasks**, earn **XP & rewards**, unlock **badges**, and compete on **leaderboards** with friends or across the city. Inspired by **Pokémon GO + Strava**, built with **React Native, Node.js, Express, MongoDB, and Mapbox**.  
---

# Future Updates & Goals

We’re targeting a **Beta Release in December**, and here’s what needs to be accomplished before launch:

## Bugs to Fix
- Improve logic for territory formation on the map  
- Resolve layout issues in the preview build (focus on optimization and performance)  

## Features to Implement
- Friends & Communities (social layer)  
- Group territory formation (clan-based logic)  
- Route history tracking  
- Background tracking (continue tracking even when the app is minimized)  
- Session-wise tracking  

## App Story & Vision
This project is a **gamified fitness app** that combines health tracking with interactive gameplay. Alongside standard features like step counting and calorie tracking, the app introduces a unique mechanic:

- As users walk, their routes are tracked on a **3D Map (powered by Mapbox)**.  
- If a user completes a closed path, a **territory is formed**.  
- Territories are the core gameplay element, evolving into a competitive and collaborative experience.  

### Clan System (Yet to be implmented)
- Each player owns individual territories.  
- Players in the same clan combine their territories into a **shared clan territory**.  
- Weekly **Clan Wars** introduce fitness competitions, encouraging teamwork, consistency, and friendly rivalry.
  
<p align="center">
  <img src="https://github.com/user-attachments/assets/b90815fb-f966-4aa5-9162-0a8cfeaf3d54" alt="Screenshot 1" width="30%" />
  <img src="https://github.com/user-attachments/assets/d328dc20-95c4-4c22-af1f-2f0b34c80781" alt="Screenshot 2" width="30%" />
  <img src="https://github.com/user-attachments/assets/43d3b287-7273-4b37-acb7-862e4e9e473c" alt="Screenshot 3" width="30%" />
</p>

---
Setup
# clone repo
git clone https://github.com/your-username/gamified-fitness-app.git
cd gamified-fitness-app

# checkout develop
git checkout develop

# create feature branch
git checkout -b feature/frontend-auth-ui

---

## 🚀 Features
- 🔑 **Secure Authentication** – JWT-based login & signup.  
- 🌍 **Territory Claiming** – Walk to capture real-world areas (GeoJSON polygons).  
- 🎯 **Dynamic Tasks & Missions** – Daily/weekly fitness challenges with XP rewards.  
- 🔥 **Streaks & Multipliers** – Keep your streak alive to earn boosted rewards.  
- 🏅 **Badges & Achievements** – Unlock milestones (distance, territories, streaks).  
- 📊 **Leaderboards** – City-wide + friends-only competitive rankings.  
- 👥 **Social Features** – Add friends, join groups, share progress.  
- 🔔 **Notifications** – Get streak alerts, territory defense alerts, and task reminders.  

---

## 🛠️ Tech Stack
**Frontend (Mobile)**  
- React Native (Expo)  
- Mapbox SDK  
- Socket.io (real-time updates)  
- Firebase (push notifications)  

**Backend**  
- Node.js + Express  
- MongoDB + Mongoose (GeoJSON for territories)  
- JWT Authentication  
- Socket.io  

**DevOps & QA**  
- Jest (frontend tests)  
- Mocha + Chai (backend tests)  
- Postman (API testing)  
- Docker + GitHub Actions (CI/CD pipeline)  

---

## 📂 Project Structure

## 👥 Team Members

- Divayang – Frontend (React Native, Mapbox, integration)

- Ronak – Frontend (UI, tasks, rewards, leaderboards)

- Aayush – Backend (auth, DB, APIs)

- Saahil – Backend (rewards, badges, optimization)

- Sujal – QA & Deployment (testing, CI/CD, staging & production)

## 🎯 Roadmap (10 Weeks)

- W1–3: Auth, profile, base map, core backend.

- W3–5: Territory claiming (real-time), task generator.

- W5–7: XP system, streaks, rewards, tasks UI.

- W7–9: Leaderboards, badges, social features.

- W9–10: Final polish, QA, deployment.

## 📌 Milestones

- MI1: Auth & profile ready.

- MI2: Territory claiming functional.

- D1: Task system live.

- D2: Leaderboards and badges working.

- D3: Production-ready beta release.
