# Supabase Setup for Ririnedoro Timer

This guide will help you set up Supabase to store analytics data in the cloud.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project

## Setup Steps

### 1. Create Your Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details and create the project
4. Wait for the project to be ready

### 2. Set Up the Database

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Open the file `supabase_schema.sql` from this project
4. Copy and paste the entire SQL content into the SQL Editor
5. Click "Run" to execute the SQL
6. You should see success messages for creating tables, policies, and functions

### 3. Get Your API Credentials

1. In your Supabase dashboard, go to "Settings" → "API"
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public** key (starts with `eyJ...`)

### 4. Configure the App

1. Copy the file `supabase-config.example.js` to `supabase-config.js`
2. Edit `supabase-config.js` and replace:
   ```javascript
   url: 'YOUR_SUPABASE_URL',
   anonKey: 'YOUR_SUPABASE_ANON_KEY'
   ```
   With your actual credentials from step 3

### 5. Update index.html

Add these scripts before the closing `</body>` tag in `index.html`:

```html
<!-- Supabase CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Your configuration -->
<script src="supabase-config.js"></script>

<!-- Supabase integration -->
<script src="supabase-integration.js"></script>

<!-- Your main script (keep this last) -->
<script src="script.js"></script>
```

### 6. Enable Authentication (Optional)

If you want users to sign in:

1. Go to "Authentication" → "Providers" in Supabase
2. Enable your preferred provider (Email, Google, etc.)
3. Users will need to sign in to sync their data

### 7. Testing

1. Open your app in the browser
2. Complete a Pomodoro session
3. Check your Supabase dashboard:
   - Go to "Table Editor" → "daily_stats" to see your data
   - Go to "Table Editor" → "streaks" to see streak data

## Data Structure

### Tables Created

1. **pomodoro_sessions** - Stores each Pomodoro session
2. **daily_stats** - Aggregated daily statistics
3. **streaks** - Track user streaks

### Security

- Row Level Security (RLS) is enabled
- Users can only access their own data
- Policies ensure data isolation

## Usage

The app will automatically:
- Save Pomodoro sessions to Supabase when completed
- Sync data every 5 minutes
- Update streaks in real-time
- Fall back to localStorage if Supabase is unavailable

## Troubleshooting

### Data not syncing
- Check browser console for errors
- Verify your Supabase credentials are correct
- Make sure the SQL schema was executed successfully

### RLS Policy Errors
- Ensure you're signed in (if using authentication)
- Check that policies were created in the SQL script

### Connection Issues
- Verify your Supabase URL is correct
- Check if your Supabase project is paused (free tier pauses after inactivity)

## Next Steps

- Add user authentication for multi-device sync
- Create custom dashboards in Supabase
- Export data for analysis
- Set up email notifications

