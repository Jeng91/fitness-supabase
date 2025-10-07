@echo off
echo Starting AppzStory Webhook Server...
echo.
echo Make sure you have set your environment variables:
echo - APPZSTORY_SECRET_KEY
echo - PORT (optional, default: 3001)
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start the webhook server
echo Starting webhook server on port 3001...
npm run webhook

pause