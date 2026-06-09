# Audiveris OMR microservice. Ubuntu 24.04 base so the official Audiveris
# ubuntu24.04 .deb (which bundles its own JRE) installs cleanly.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg fontconfig libfreetype6 tesseract-ocr \
      libgl1 xvfb \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && curl -L -o /tmp/audiveris.deb \
      https://github.com/Audiveris/audiveris/releases/download/5.10.2/Audiveris-5.10.2-ubuntu24.04-x86_64.deb \
 && apt-get install -y /tmp/audiveris.deb \
 && rm -f /tmp/audiveris.deb \
 && rm -rf /var/lib/apt/lists/*

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
