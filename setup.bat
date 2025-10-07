@echo off
echo ==========================================
echo    Fitness QR Payment System Setup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo.

REM Check if .env file exists
if not exist ".env" (
    echo 📄 Creating .env file from template...
    copy ".env.example" ".env"
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file with your actual API keys!
    echo    - Supabase URL and Key
    echo    - AppzStory Studio API credentials
    echo.
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Create batch files for easy startup
echo 📝 Creating startup scripts...

REM Create start-frontend.bat
echo @echo off > start-frontend.bat
echo echo Starting React Frontend... >> start-frontend.bat
echo npm start >> start-frontend.bat
echo pause >> start-frontend.bat

REM Create start-both.bat  
echo @echo off > start-both.bat
echo echo Starting Fitness QR Payment System... >> start-both.bat
echo echo. >> start-both.bat
echo echo Starting Webhook Server... >> start-both.bat
echo start "Webhook Server" cmd /k "npm run webhook" >> start-both.bat
echo echo. >> start-both.bat
echo timeout /t 3 /nobreak ^>nul >> start-both.bat
echo echo Starting React Frontend... >> start-both.bat
echo npm start >> start-both.bat

echo.
echo ==========================================
echo           🎉 Setup Complete! 🎉
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. 📝 Edit .env file with your API credentials:
echo    - REACT_APP_SUPABASE_URL
echo    - REACT_APP_SUPABASE_ANON_KEY  
echo    - REACT_APP_APPZSTORY_API_KEY
echo    - REACT_APP_APPZSTORY_SECRET_KEY
echo.
echo 2. 🗄️  Setup database tables:
echo    - Run SQL files in Supabase dashboard
echo    - create_qr_payments_table.sql
echo    - create_memberships_table.sql
echo    - add_membership_columns.sql
echo.
echo 3. 🚀 Start the application:
echo    - start-both.bat (starts webhook + frontend)
echo    - start-frontend.bat (frontend only)
echo    - start-webhook.bat (webhook only)
echo.
echo 4. 🌐 Access the application:
echo    - Frontend: http://localhost:3000
echo    - Webhook Health: http://localhost:3001/health
echo.
echo 5. 📚 Read documentation:
echo    - QR_PAYMENT_README.md
echo    - WEBHOOK_GUIDE.md
echo    - TESTING_GUIDE.md
echo.
echo ==========================================
echo.

pause