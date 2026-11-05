# Cleankey ordering system

Internal ordering tool hosted on Netlify.

## Required Netlify environment variables

Set these in **Netlify → Site configuration → Environment variables**, then redeploy.
Never put them in the code.

| Variable | What it does |
|---|---|
| `APP_ACCESS_CODE` | Team code needed to save and view the shared order history. The app asks for it once per browser. |
| `ADMIN_PASSWORD` | Password for the admin product module. Checked on the server. |

Until these are set, the history and admin functions refuse every request (the app still works with local, per-browser history).
