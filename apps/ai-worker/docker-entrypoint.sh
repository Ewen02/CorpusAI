#!/bin/sh
set -e

echo "Starting worker..."
exec node dist/index.js
