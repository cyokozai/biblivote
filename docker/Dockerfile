# syntax=docker/dockerfile:1

# ---- serve stage ----
# Static files are served by nginx.
# Environment variables (GAS_ENDPOINT, GRAFANA_URL, etc.) are injected
# at container startup by docker/entrypoint.sh so that the same image
# can be deployed across environments without rebuild.
FROM nginx:1.27-alpine

# Remove the default nginx site config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy static files
COPY index.html        /usr/share/nginx/html/index.html
COPY src/              /usr/share/nginx/html/src/
COPY image/            /usr/share/nginx/html/image/
COPY _headers          /usr/share/nginx/html/_headers

# Copy nginx config and startup entrypoint
COPY docker/nginx.conf      /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh   /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
