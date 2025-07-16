#!/bin/bash

echo "🔄 Starting auto-deployment process..."

# Git pull
echo "📥 Pulling latest changes..."
git pull origin master

# Gradle build
echo "🏗️ Building project with Gradle..."
./gradlew build -x test

# Docker restart
echo "🐳 Restarting Docker containers..."
docker-compose down
docker-compose build
docker-compose up -d

echo "✅ Deployment complete!"
