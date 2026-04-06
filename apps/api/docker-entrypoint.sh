#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js
