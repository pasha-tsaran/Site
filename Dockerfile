ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.30.6-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY admin ./admin
COPY tests ./tests
COPY dist/assets ./dist/assets
RUN npm run check && npm test && npm run build

FROM ${NODE_IMAGE} AS cms
ARG VCS_REF=working-tree
LABEL org.opencontainers.image.title="Твой дом CMS" \
      org.opencontainers.image.source="https://github.com/pasha-tsaran/Site" \
      org.opencontainers.image.revision="${VCS_REF}"
WORKDIR /app
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/admin ./admin
COPY --from=build /app/package.json ./package.json
ENV HOST=0.0.0.0 PORT=4190 CMS_DATA_DIR=/data
EXPOSE 4190
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:4190/content.js',r=>{r.resume();r.on('end',()=>process.exit(r.statusCode===200?0:1))}).on('error',()=>process.exit(1))"
CMD ["node", "scripts/cms-server.mjs"]

FROM ${NGINX_IMAGE} AS runtime
ARG VCS_REF=working-tree
LABEL org.opencontainers.image.title="Твой дом" \
      org.opencontainers.image.source="https://github.com/pasha-tsaran/Site" \
      org.opencontainers.image.revision="${VCS_REF}"
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
