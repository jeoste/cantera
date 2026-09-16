---
name: cantera-update
description: Crée ou met à jour des profils cantera via POST /ingest JSON. Use when adding candidates to the Data-Major Ibérica vivier.
---

# Ingest cantera

Base : `https://cantera-iberica.vercel.app`

Auth : `Authorization: Bearer $CANTERA_AGENT_TOKEN`

OpenAPI : `GET https://cantera-iberica.vercel.app/ingest/openapi.json`

## Créer / mettre à jour

```bash
curl -s -X POST https://cantera-iberica.vercel.app/ingest \
  -H "Authorization: Bearer $CANTERA_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"createIfMissing":true,"profiles":[{"fullName":"Luis García","linkedinUrl":"https://www.linkedin.com/in/luis-garcia","currentTitle":"Data Engineer","status":"to_contact"}]}'
```

Idempotent sur `linkedinUrl`. Pour créer : `fullName` + `linkedinUrl`.

Statuts : `to_contact`, `contacted`, `replied`, `interview`, `offer`, `hired`, `too_expensive`, `candidate_declined`, `wrong_fit`, `on_hold`, `rejected_by_us`, `no_reply`, `blacklisted`.

Ne scrape pas LinkedIn.
