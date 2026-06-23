#!/bin/sh
set -e

cd /app

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
elif [ -f package-lock.json ] && [ package-lock.json -nt node_modules ]; then
  npm ci
elif [ package.json -nt node_modules ]; then
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

exec "$@"
