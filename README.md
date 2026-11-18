# Skillora

Skillora is a student skill-exchange platform for discovering skills, sending exchange requests, completing learning sessions, reviewing partners, and managing the platform.

## Run locally (full functionality — login + database)

```powershell
cd "d:\developer\learn hub web\Skillora.Mvc"
dotnet run
```

Open `http://localhost:5019/`. This serves the frontend (wwwroot) AND the `/api/*` endpoints, and connects to SQL Server LocalDB.

## Static preview only (no login / no database)

```powershell
cd "d:\developer\learn hub web"
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Login, registration and admin data will NOT work in this mode (no backend).

## Included prototype features
- Arabic RTL landing page and responsive mobile layout
- Deep search (global nav search + filters + Arabic normalization)
- Student signup and login interface (email/password + Google Sign-In)
- Student dashboard and skill recommendations
- Skill and student search with category filters
- Sent and received exchange requests
- Active and completed exchanges
- Skill and review management
- Admin dashboards for users, skills, requests, and activity
- CSV export for the user administration report
- Browser-local persistence with `localStorage`
- Real SQL Server-backed student registration and login
- Password hashing and HTTP cookie sessions
- Database-backed user skills, reviews, and exchange APIs
- Firebase Google Sign-In for the `skillora-learnhub` project

## SQL Server
Open [database.sql](database.sql) in SQL Server Management Studio and execute it to create the Skillora database and core tables:
- Users
- Skills
- UserSkills
- ExchangeRequests
- Reviews
- ActivityLogs

The MVC app also calls `EnsureCreated()` on startup, so the database is created automatically if missing.

## Firebase / Google Sign-In
The Firebase config is in `index.html` and `Skillora.Mvc/appsettings.json`. For Google Sign-In to work:
- `localhost` must be an authorized domain in the Firebase console (Authentication → Settings → Authorized domains).
- The Firebase project must have Google provider enabled.

## Technology path
The frontend prototype is built with HTML, CSS, and JavaScript. The implementation also includes a real ASP.NET Core MVC project in `Skillora.Mvc`, C# REST API controllers, and Entity Framework Core with Microsoft SQL Server.

## Run ASP.NET Core MVC
```powershell
cd "d:\developer\learn hub web\Skillora.Mvc"
dotnet run
```
The default SQL Server LocalDB connection is configured in `appsettings.json`.