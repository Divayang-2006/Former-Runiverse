# 🏃‍♂️ Gamified Fitness App  

A mobile-first **fitness gamification platform** where users can **walk to claim territories**, complete **dynamic tasks**, earn **XP & rewards**, unlock **badges**, and compete on **leaderboards** with friends or across the city. Inspired by **Pokémon GO + Strava**, built with **React Native, Node.js, Express, MongoDB, and Mapbox**.  

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

### Newly Added

#### Edit Profile Feature
An `edit-profile` screen was added allowing users to update their `username` and `avatarUrl`.

Key pieces:
 - `app/edit-profile.tsx`: Form UI with validation and loading state.
 - `services/profileService.ts`: Mock async update method (simulates API latency).
 - `store/useStore.ts`: New `updateUser` action merges partial changes into persisted user state.
 - `app/(tabs)/profile.tsx`: Now consumes the store user and provides a button to navigate to edit screen.
 - `app/_layout.tsx`: Stack updated to include the `edit-profile` route.

Flow:
1. User taps `Edit Profile` on Profile screen.
2. Form pre-fills current username & avatar.
3. On save: client validates username, calls mock service, updates Zustand store, shows success alert, and navigates back.

Future improvements (suggested):
 - Add backend integration.
 - Allow photo picker upload (Expo ImagePicker) instead of raw URL.
 - Add additional fields (bio, location, stats visibility toggle).
 - Inline error display beneath inputs.

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