#!/bin/sh
# Runtime environment variable replacement for Next.js
# Replaces __PLACEHOLDER__ values with actual environment variables

set -e

# Define placeholders and their corresponding env vars
replace_placeholder() {
    local placeholder=$1
    local value=$2

    if [ -n "$value" ]; then
        echo "Replacing $placeholder with runtime value"
        # Replace in all JS files (static chunks and server)
        find /app/.next -type f -name "*.js" -exec sed -i "s|$placeholder|$value|g" {} + 2>/dev/null || true
        find /app/.next -type f -name "*.json" -exec sed -i "s|$placeholder|$value|g" {} + 2>/dev/null || true
    fi
}

# Replace all placeholders with runtime environment variables
replace_placeholder "__NEXT_PUBLIC_API_URL__" "${NEXT_PUBLIC_API_URL:-}"
replace_placeholder "__NEXT_PUBLIC_APP_NAME__" "${NEXT_PUBLIC_APP_NAME:-OpenTracker}"
replace_placeholder "__NEXT_PUBLIC_APP_LOGO__" "${NEXT_PUBLIC_APP_LOGO:-/logo.png}"
replace_placeholder "__NEXT_PUBLIC_BASE_PATH__" "${NEXT_PUBLIC_BASE_PATH:-}"

echo "Environment variables injected successfully"

# Execute the main command
exec "$@"
