#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js
