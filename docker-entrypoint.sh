#!/bin/sh
# Runtime environment variable replacement for Next.js
# Replaces __PLACEHOLDER__ values with actual environment variables
#
# NOTE: NEXT_PUBLIC_BASE_PATH is NOT replaceable at runtime because
# Next.js validates it at build time (must start with /)

set -e

# Define placeholders and their corresponding env vars
replace_placeholder() {
    local placeholder=$1
    local value=$2

    if [ -n "$value" ]; then
        echo "Replacing $placeholder with runtime value"
        # Replace in all relevant files (JS, JSON, HTML, and RSC payloads)
        find /app/.next -type f \( -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.rsc" \) -exec sed -i "s|$placeholder|$value|g" {} + 2>/dev/null || true
        # Also replace in the server directory specifically (for SSR)
        find /app/.next/server -type f -exec sed -i "s|$placeholder|$value|g" {} + 2>/dev/null || true
    fi
}

# Replace all placeholders with runtime environment variables
replace_placeholder "__NEXT_PUBLIC_API_URL__" "${NEXT_PUBLIC_API_URL:-}"
replace_placeholder "__NEXT_PUBLIC_APP_NAME__" "${NEXT_PUBLIC_APP_NAME:-OpenTracker}"
replace_placeholder "__NEXT_PUBLIC_APP_LOGO__" "${NEXT_PUBLIC_APP_LOGO:-/logo.png}"

echo "Environment variables injected successfully"

# Execute the main command
exec "$@"
