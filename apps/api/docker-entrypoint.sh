#!/bin/sh
set -e

echo "Syncing database schema..."
prisma db push --schema=./node_modules/@corpusai/database/prisma/schema.prisma --accept-data-loss --skip-generate

echo "Starting API server..."
exec node dist/main.js
