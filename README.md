# Try SnapCal

SnapCal is fully deployed and accessible directly from the browser.

Simply open the application link and start using it — no installation required.

https://snapcalgu.lovable.app

# SnapCal 

> Your schedule, your snapshots.

SnapCal is a smart student productivity platform that automatically organizes lecture photos into the correct classes using calendar schedules and timestamps.

SnapCal is a web app built during the Lovable Hackathon to help students reduce gallery chaos by connecting lecture schedules with uploaded photos of notes or lecture slides and boards.
---

# The Problem

Students constantly take photos of:
- lecture slides
- whiteboards
- handwritten notes
- assignment explanations
- exam review sessions

But after a few days, those images disappear into an unstructured camera roll.

Current student workflows are fragmented:
- schedules are in one app
- notes are somewhere else
- lecture photos get buried in the gallery

This creates:
- wasted study time
- lost material
- unnecessary stress
- information overload

---

# The Solution

SnapCal automatically matches uploaded lecture photos with calendar events using lecture schedules

The system organizes study material into the correct lecture automatically.


Students can:
- import schedules
- upload lecture photos
- browse lecture-specific materials
- add notes to lectures

---

# Features

## TimeEdit Calendar Import
Upload `.ics` files directly from TimeEdit to automatically create your academic schedule.


## Smart Photo Matching
Images uploaded during lecture timeframes are automatically grouped under the correct event.


## Unmatched Image Detection
If an image cannot be matched automatically, SnapCal places it inside the “Unmatched Images” page for manual assignment.


## Lecture Notes
Each lecture page supports custom notes and study annotations.


## Lecture-Centered Workflow
Every lecture page contains:
- lecture information
- uploaded photos
- notes
- timestamps
- location details

---

# Demo

## Sign In

Every student has their own customised calendar schedule and uploaded images.

<img width="585" height="607" alt="image" src="https://github.com/user-attachments/assets/bd668fa7-cacc-4eb4-899e-75db6d63afc9" />


---

## Calendar Import

Import TimeEdit `.ics` schedules directly into the application.

<img width="774" height="596" alt="image" src="https://github.com/user-attachments/assets/1f23ea3b-73ad-4c20-af9e-f9f276418585" />


---

## Uploaded Calendars

Manage uploaded academic schedules.

<img width="850" height="364" alt="image" src="https://github.com/user-attachments/assets/2853807a-0535-4089-8cd3-dc6a484567f2" />

---

## Weekly Calendar View

Interactive weekly calendar displaying lectures and uploaded lecture photo counts.

<img width="1436" height="818" alt="image" src="https://github.com/user-attachments/assets/f6eb7ac5-f741-40e2-8259-3719936ea1c0" />


---

## Lecture Details Page

Each lecture contains:
- time and duration
- lecture location
- notes
- uploaded lecture photos

<img width="821" height="410" alt="image" src="https://github.com/user-attachments/assets/ac5eadd1-b910-48f0-a7de-c83de6901466" />

---

## Lecture Notes

Students can create quick notes for each lecture session.

<img width="840" height="192" alt="image" src="https://github.com/user-attachments/assets/6d87101f-15bf-448c-81d1-5e762d107d69" />


---

## Unmatched Images

Images that cannot automatically be assigned are isolated for manual review and reassignment.

<img width="959" height="702" alt="image" src="https://github.com/user-attachments/assets/684ce504-203b-4e5f-92eb-ca99419ff6d1" />


---

# Technical Highlights

SnapCal combines:
- calendar synchronization
- timestamp processing
- cloud image storage
- event-based organization
- responsive scheduling interfaces

into a single workflow designed specifically for students.

Key technical features include:
- automatic image-to-event matching
- Supabase storage integration
- database-driven event organization
- responsive calendar rendering
- dynamic lecture-based image retrieval

---

# Tech Stack

## Frontend
- React
- TypeScript
- Tailwind CSS

## Backend & Infrastructure
- Supabase
- PostgreSQL
- Supabase Storage
- Supabase Authentication

## Integrations
- TimeEdit `.ics` Calendar Import




