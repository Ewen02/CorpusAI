#!/bin/sh
set -e

echo "Generating Prisma client..."
prisma generate --schema=./prisma/schema.prisma

echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js
