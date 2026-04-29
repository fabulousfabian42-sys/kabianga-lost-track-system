# University of Kabianga Lost and Track System

A full-stack lost and found tracker for the University of Kabianga. Includes:
- Login and registration for students and staff
- Admin dashboard
- Security office workflow
- Lost and found reporting with image uploads
- Phone number contact information
- Claim requests and approvals
- SQLite database and Express backend

## Setup
1. Open a terminal in `c:\Users\ADMIN\real project`
2. Run `npm install`
3. Run `npm start`
4. Open `http://localhost:3000`

## Registration
Users can register as either students or staff members. After registration, users need to log in to access the system.

## Notes
- Students and staff can report lost or found items with images and contact information
- Security office processes items and manages claim approvals
- Admin dashboard provides system overview and management tools

## Deploying to Render
1. Push this project to a GitHub repository.
2. Sign in to Render and create a new Web Service.
3. Connect the GitHub repo and choose the default branch.
4. Set the build command to `npm install` and the start command to `npm start`.
5. Use `https://<your-service>.onrender.com` once deployment completes.

Render is recommended because it supports Node.js apps with Express and can host your app remotely 24/7.
