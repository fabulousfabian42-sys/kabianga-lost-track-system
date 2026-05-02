# University of Kabianga Lost and Track System

A full-stack lost and found tracker for the University of Kabianga. Includes:
- Login and registration for students and staff
- Admin dashboard
- Security office workflow
- Lost and found reporting with image uploads
- Phone number contact information
- Claim requests and approvals
- **PostgreSQL database** with persistent storage (Render-compatible)
- Express backend with session management

## Setup
1. Open a terminal in `c:\Users\ADMIN\real project`
2. Run `npm install`
3. Configure PostgreSQL database (see POSTGRES_SETUP.md)
4. Run `npm start`
5. Open `http://localhost:3000`

## Default Credentials
- **Admin**: `admin` / `THEFABULOUS`
- **Security**: `security` / `securityadmin@26`

## Features
- Students and staff can report lost or found items with images and contact information
- Security office processes items and manages claim approvals
- Admin dashboard provides system overview and management tools
- Persistent data storage with PostgreSQL
- Automatic database initialization on startup

## Deploying to Render

### Quick Setup
1. Push this project to GitHub
2. Create a PostgreSQL database on Render (see POSTGRES_SETUP.md for detailed steps)
3. Create a Web Service on Render connected to your GitHub repo
4. Add `DATABASE_URL` environment variable with your Render PostgreSQL connection string
5. Deploy - your app will be live at `https://<your-service>.onrender.com`

### Important: PostgreSQL Setup Required
**This app now uses PostgreSQL instead of SQLite.**
See [POSTGRES_SETUP.md](POSTGRES_SETUP.md) for detailed instructions on:
- Creating a PostgreSQL database on Render
- Setting up environment variables
- Verifying your deployment

Without a PostgreSQL database configured, the app will fail to start on Render.

## Database
- Uses PostgreSQL for persistent, scalable data storage
- Automatic table creation on app startup
- Session storage in PostgreSQL
- All data persists across app restarts and redeployments
