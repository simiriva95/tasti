# Audiveris OMR microservice. Ubuntu 24.04 base so the official Audiveris
# ubuntu24.04 .deb (which bundles its own JRE) runs against a matching libc.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
# We EXTRACT the .deb (dpkg-deb -x) instead of installing it: the jpackage
# maintainer scripts do desktop-menu integration that fails on a headless
# server (dpkg configure error 100). The JRE and libs are bundled in the
# app-image, so the extracted /opt/audiveris tree runs on its own — we just
# provide the runtime deps (tesseract, fonts, GL, xvfb) via apt.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg fontconfig libfreetype6 tesseract-ocr \
      libgl1 xvfb \
      libx11-6 libxext6 libxrender1 libxtst6 libxi6 libxrandr2 libasound2t64 \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && curl -L -o /tmp/audiveris.deb \
      https://github.com/Audiveris/audiveris/releases/download/5.11.0/Audiveris-5.11.0-ubuntu24.04-x86_64.deb \
 && dpkg-deb -x /tmp/audiveris.deb / \
 && rm -f /tmp/audiveris.deb \
 && rm -rf /var/lib/apt/lists/* \
 && test -x /opt/audiveris/bin/Audiveris

# Path of the launcher installed by the jpackage .deb (verify if it changes).
ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV USE_XVFB=1
ENV PORT=8080

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./

RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8080
CMD ["node", "server.mjs"]
