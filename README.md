# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Email Configuration (for PIN reset functionality)

To enable email sending (for forgot PIN feature), configure the following environment variables on your server:

### Gmail SMTP Configuration

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use Gmail App Password, not regular password
SMTP_FROM=your-email@gmail.com  # Optional: sender email address
```

### Getting Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to "App passwords" (or visit: https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"
5. Use this 16-character password as `SMTP_PASS`

### Other SMTP Providers

You can use any SMTP provider by configuring:

```bash
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587  # or 465 for SSL
SMTP_SECURE=false  # true for port 465
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

### Render.com Configuration

Add these environment variables in your Render.com dashboard:
- Go to your service → Environment
- Add the SMTP variables listed above

For more information and support, please contact Base44 support at app@base44.com.