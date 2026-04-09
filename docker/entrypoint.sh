#!/bin/sh
# docker/entrypoint.sh
# Injects environment variables into index.html window.* assignments at startup.
# This mirrors what scripts/inject-env.js does but without requiring Node.js
# in the final image.
set -e

HTML=/usr/share/nginx/html/index.html

inject_var() {
    KEY="$1"
    VAL="$2"
    if [ -z "$VAL" ]; then
        echo "[entrypoint] $KEY: skipped (not set)"
        return
    fi
    # Escape characters special in sed replacement
    ESCAPED=$(printf '%s' "$VAL" | sed "s/[&\\\\]/\\\\\\\\&/g; s|/|\\\\/|g")
    # Match: window.KEY  =  ''  (variable whitespace)
    sed -i "s|window\\.$KEY[[:space:]]*=[[:space:]]*''|window.$KEY = '$ESCAPED'|g" "$HTML"
    echo "[entrypoint] $KEY: injected"
}

echo "[entrypoint] Injecting environment variables into index.html..."
inject_var GAS_ENDPOINT         "$GAS_ENDPOINT"
inject_var GRAFANA_URL          "$GRAFANA_URL"
inject_var RECAPTCHA_SITE_KEY   "$RECAPTCHA_SITE_KEY"
inject_var GOOGLE_BOOKS_API_KEY "$GOOGLE_BOOKS_API_KEY"
echo "[entrypoint] Done."

exec "$@"
