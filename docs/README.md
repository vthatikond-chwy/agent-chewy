# Agent Chewy - Test Dashboard

GitHub Pages dashboard for viewing API and UI test results.

## Setup

1. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"

2. **Deploy:**
   - Push to `main` branch
   - GitHub Actions will automatically:
     - Generate test data from feature files
     - Deploy to GitHub Pages

3. **Access:**
   - Your site will be available at: `https://[username].github.io/[repo-name]/`

## Manual Deployment

To generate test data locally:

```bash
npm run pages:generate
```

This creates `test-data.json` from your feature files in:
- `features/api/` → API Tests tab
- `features/ui/` → UI Tests tab

## Features

- **API Tests Tab** (default): Shows all API tests organized by team
- **UI Tests Tab**: Shows all UI test recordings
- **Auto-updates**: Refreshes when new feature files are added
- **Stats Dashboard**: Shows passed/failed/total counts

## File Structure

```
docs/
├── index.html          # Main dashboard page
├── test-data.json      # Auto-generated test metadata
└── .nojekyll          # Disables Jekyll processing
```

