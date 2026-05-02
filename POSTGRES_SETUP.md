# PostgreSQL Setup for Render Deployment

## Steps to Set Up Persistent Database on Render

### 1. Create PostgreSQL Database on Render

1. Go to [render.com](https://render.com)
2. Log in to your account
3. Click "New +" and select "PostgreSQL"
4. Fill in the details:
   - **Name**: `kabianga-db` (or your preferred name)
   - **Database**: `kabianga_lost_found`
   - **User**: `postgres` (default)
   - **Region**: Choose the same region as your service
   - **PostgreSQL Version**: 14 or higher recommended
5. Click "Create Database"
6. Wait for the database to be created (usually 2-3 minutes)

### 2. Get Database Connection String

1. Once created, click on the database
2. Copy the **Internal Database URL** (for same-region service)
   - Format: `postgresql://username:password@hostname:5432/database_name`

### 3. Add DATABASE_URL to Your Service

1. Go to your Render service (the web service)
2. Click "Environment"
3. Add a new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Internal Database URL you copied
4. Click "Save Changes"

### 4. Trigger Redeployment

Option A (Automatic):
- Render will automatically redeploy your service when you save the environment variable

Option B (Manual):
- Go to "Deploys" tab
- Click "Deploy latest commit"

### 5. Verify Database Connection

Once redeployed:
1. Check the service logs to ensure no errors
2. Test the app by logging in with default credentials:
   - **Admin**: `admin` / `THEFABULOUS`
   - **Security**: `security` / `securityadmin@26`
3. Create a test item to verify database is working

## What Changed in the Code

- **Replaced SQLite** with **PostgreSQL** for persistent storage
- **All queries** now use PostgreSQL syntax (`$1`, `$2` instead of `?`)
- **Session storage** moved to PostgreSQL table
- **Automatic table creation** on app startup
- **Default accounts** created on first run

## Database Tables

1. **users** - User accounts with roles
2. **items** - Lost and found items
3. **claims** - Claims for items
4. **session** - Express session storage

## Notes

- The database persists across app restarts and redeployments
- All data is backed up by Render
- You can view data using Render's SQL editor or any PostgreSQL client
- File uploads still stored locally in `/public/uploads`

## Troubleshooting

### Database Connection Error
- Check if DATABASE_URL is set correctly in environment variables
- Verify database is in running state on Render dashboard
- Ensure internal URL is used (not external URL)

### Default Accounts Not Created
- Check service logs for errors
- Database might not be accessible at startup
- Try redeploying: go to Deploys → Deploy latest commit

### Query Errors
- All SQLite syntax (?) has been replaced with PostgreSQL ($1, $2)
- Queries now use RETURNING for auto-increment IDs
- TIMESTAMP fields automatically set to CURRENT_TIMESTAMP

## Testing Locally

To test locally before deploying:

1. Install PostgreSQL on your machine
2. Create a database:
   ```sql
   CREATE DATABASE kabianga_lost_found;
   ```

3. Update `.env` file:
   ```
   DATABASE_URL=postgresql://localhost/kabianga_lost_found
   NODE_ENV=development
   ```

4. Run the app:
   ```bash
   npm start
   ```

The app will automatically create all tables on first run.
