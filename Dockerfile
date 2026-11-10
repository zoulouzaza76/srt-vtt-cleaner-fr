FROM node:22-alpine
LABEL org.opencontainers.image.title="srt-vtt-cleaner-fr — Nettoyage SRT/VTT & Corpus IRaMuTeQ (Le Scribe Audio)"
LABEL org.opencontainers.image.description="Nettoyage déterministe de sous-titres SRT/VTT (Teams, Zoom, YouTube, Whisper) et export de corpus étoilés IRaMuTeQ (https://lescribeaudio.com/outils/nettoyeur-srt-vtt-texte)"
LABEL org.opencontainers.image.url="https://lescribeaudio.com/outils/nettoyeur-srt-vtt-texte"
LABEL org.opencontainers.image.documentation="https://lescribeaudio.readthedocs.io/en/latest/"
LABEL org.opencontainers.image.source="https://github.com/zoulouzaza76/srt-vtt-cleaner-fr"
LABEL org.opencontainers.image.vendor="Le Scribe Audio (https://lescribeaudio.com)"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json ./
COPY dist ./dist
ENTRYPOINT ["node", "dist/cli.js"]
