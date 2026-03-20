# BioXtenshi - Medical Visit Management System

BioXtenshi is a dual-dashboard management system designed for medical teams (**BioTechPharmaMD** and **Tenshi**). It allows users to schedule, track, and manage their visits to doctors, pharmacies, and wholesalers.

## Features
- **Dual Dashboard System**: Dedicated environments for two distinct teams.
- **Supervisor Mode**: Admins can oversee team members in a read-only mode.
- **Calendar Management**: Drag-and-drop scheduling for visits.
- **Visit Tracking**: Detailed forms for various visit types (Medical, Pharmacy, etc.).
- **User Roles**: Distinct access levels for Admins (Supervisors) and standard Users.

---

## Prerequisites

Before running the project, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Local instance or Atlas connection string)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/SlimBenTanfous1/bioxtenshi.git
    cd bioxtenshi
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

1.  Create a `.env` file in the root directory:
    ```bash
    touch .env
    ```

2.  Add the following variables to `.env`:
    ```env
    MONGODB_URI=mongodb://localhost:27017/bioxtenshi
    PORT=5000
    JWT_SECRET=your_jwt_secret_key_here
    ```
    *(Adjust `MONGODB_URI` if you are using a remote database)*

## Database Seeding

To set up the initial users (Admins and Team Members), run the seed script:

```bash
node seed-official-users.js
```

This will:
1.  Clear the existing database user list.
2.  Create **Admin Users** (Access to both dashboards).
3.  Create **BioTechPharmaMD** Users (Green Dashboard).
4.  Create **Tenshi** Users (Blue Dashboard).

**Default Password for all users**: `123456`

---

## Running the Application

You need to run both the Backend Server and the Frontend Client.

### 1. Start the Backend Server
In a terminal window:
```bash
node server/index.js
```
*Expected Output:* `Server is running on port 5000` / `Connected to MongoDB`

### 2. Start the Frontend Application
In a **new** terminal window:
```bash
npm run dev
```
*Expected Output:* `Local: http://localhost:5173/`

### 3. Access the App
Open your browser and navigate to: [http://localhost:5173](http://localhost:5173)

---

## User Accounts

### 👑 Admins (Supervisors)
*Access to both BioTechPharmaMD and Tenshi dashboards.*
- `mahmoud`
- `slim`
- `ouanes`
- `malek`

### 🌿 BioTechPharmaMD Team
*Access to Green Dashboard only.*
- `seif`
- `ines`
- `cherifa`
- `syrine`
- `soufiene`

### 🔵 Tenshi Team
*Access to Blue Dashboard only.*
- `wiem`
- `feriel`
- `rahma`
- `mohamed.f`
- `yosra`
- `farah`
- `saoussen`
- `dorra`
- `rahma.b`
- `fatma`
- `mohamed`
- `nafissa`

---

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Big Calendar
- **Backend**: Node.js, Express
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens)
