# Audita SST — API eSocial (Etapa 01)

Backend Fastify para consulta/download do evento **S-1000** nos webservices oficiais.

Documentação completa: `../docs/ESOCIAL-ETAPA01.md`.

```bash
cp .env.example .env
npm install
npm run dev      # http://127.0.0.1:8787
npm test
npm run build && npm start
```

Smoke real (nunca em CI):

```bash
ESOCIAL_TRANSPORT_MOCK=false CONFIRM_REAL_ESOCIAL=yes npm run smoke:real
```
