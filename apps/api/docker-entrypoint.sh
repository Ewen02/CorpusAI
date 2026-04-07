#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy --schema=./node_modules/@corpusai/database/prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js
