# Render Deployment Guide

This guide will help you deploy the Kabianga Lost and Track System to Render.

## Prerequisites
- GitHub account with the repository pushed to `https://github.com/YOUR_USERNAME/YOUR_REPO`
- Render account (https://render.com)

## Step 1: Create a PostgreSQL Database on Render

1. Go to https://render.com/dashboard
2. Click "New +" button → "PostgreSQL"
3. Configure the database:
   - **Name**: `kabianga-db`
   - **Region**: Choose closest to your location
   - **PostgreSQL Version**: Latest available
   - **Plan**: Free tier (for testing) or Starter (for production)
4. Click "Create Database"
5. Wait for the database to initialize (1-2 minutes)
6. Copy the **Internal Database URL** from the dashboard (format: `postgresql://user:password@host/dbname`)

## Step 2: Create a Web Service on Render

1. Go to https://render.com/dashboard
2. Click "New +" button → "Web Service"
3. Select "Build and deploy from a Git repository"
4. Click "Connect" next to your repository
   - If not listed, click "Configure account" and authorize GitHub
5. Select the repository and click "Connect"

## Step 3: Configure the Web Service

Fill in the service configuration:

- **Name**: `kabianga-lost-track`
- **Environment**: `Node`
- **Region**: Same as your database region (for better performance)
- **Branch**: `main`
- **Build Command**: `npm install` (or leave blank if using render.yaml)
- **Start Command**: `npm start` (or leave blank if using render.yaml)
- **Plan**: Free (for testing) or Starter (for production)

## Step 4: Set Environment Variables

Click "Advanced" or go to "Environment" section:

Add the following environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | Paste from Step 1 | Your PostgreSQL connection string |
| `SESSION_SECRET` | `kabianga-tracker-secret-key` | Session encryption key |
| `NODE_ENV` | `production` | Production environment |

**Important**: Make sure `DATABASE_URL` includes `?sslmode=require` at the end if not already present.

Example DATABASE_URL:
```
postgresql://user:password@dpg-xxxxx.render.com/kabianga-db?sslmode=require
```

## Step 5: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start the application (`npm start`)
3. Monitor the deployment logs in the dashboard
4. Wait for "Your service is live!" message

## Step 6: Verify Deployment

Once deployed, Render assigns your service a URL like: `https://kabianga-lost-track.onrender.com`

Test the deployment:

1. Visit the health check endpoint:
   ```
   https://kabianga-lost-track.onrender.com/health
   ```
   Should return JSON with status and database connection info

2. Visit the login page:
   ```
   https://kabianga-lost-track.onrender.com/login
   ```

3. Try logging in with default credentials:
   - Username: `admin`
   - Password: `THEFABULOUS`

## Important Notes

- **Cold Starts**: Free tier services spin down after 15 minutes of inactivity. The first request will take 30+ seconds to respond.
- **Database Persistence**: Render PostgreSQL databases are persistent. Data will be retained between deployments.
- **SSL/TLS**: Render handles SSL certificates automatically. HTTPS is enforced.
- **Automatic Deployments**: With `autoDeploy: true` in render.yaml, pushing changes to the main branch will automatically redeploy the service.

## Troubleshooting

### Deployment Fails
- Check logs in Render dashboard
- Verify DATABASE_URL is correct and database is running
- Ensure all environment variables are set

### Database Connection Errors
- Verify DATABASE_URL in environment variables
- Check that PostgreSQL database is running on Render
- Ensure SSL mode is correctly set

### Application Not Starting
- Check logs for specific error messages
- Verify NODE_ENV is set to `production`
- Ensure port configuration matches (Render assigns PORT automatically)

### User Login Issues
- Database tables should auto-initialize on first run
- Default admin user should be created automatically
- Check `/health` endpoint for database status

## Default Credentials (After Deployment)

- **Admin**: `admin` / `THEFABULOUS`
- **Security**: `security` / `securityadmin@26`

Use these to log in and verify the system is working.

## Next Steps

After successful deployment:
1. Create backup of PostgreSQL database
2. Monitor application logs for errors
3. Configure custom domain (if desired)
4. Set up automatic backups for the database
5. Scale up to paid tier if needed

For more help, visit: https://render.com/docs
