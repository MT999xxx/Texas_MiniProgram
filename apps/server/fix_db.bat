@echo off
echo Waiting for Docker services to be ready...
timeout /t 5

echo 1. Resetting Database...
call npx ts-node src/scripts/reset-db.ts

echo 2. Running Migrations...
call npm run migration:run

echo 3. Seeding Data...
call npm run seed

echo Done!
pause
