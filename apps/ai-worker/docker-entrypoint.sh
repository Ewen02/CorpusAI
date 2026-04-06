#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "Starting worker..."
exec node dist/index.js
