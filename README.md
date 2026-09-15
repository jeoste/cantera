# cantera

Vivier candidats **Data-Major Ibérica** (Málaga / français / data). Comptes **@data-major.com** uniquement.

**Prod :** [https://cantera-iberica.vercel.app](https://cantera-iberica.vercel.app)

## Stack

- Next.js 16 + Clerk (Vercel Marketplace, Hobby)
- Neon Postgres (Vercel Marketplace, Free, Frankfurt)
- UI calquée sur [data-major.com](https://www.data-major.com/fr/) (teal `#00605F`, jaune `#FFDB00`, papier `#FAF7EC`, Open Sans)

## 1. Clerk (déjà provisionné via Vercel)

Dashboard : [Clerk resource](https://vercel.com/d/dashboard/integrations/clerk/icfg_QnzcyRaXbHm1vS6oWpPu4S0N/resources/ir_jAgbfhfDFljZ0yH7)

À faire une fois dans Clerk :

1. **Restrictions → Allowlist** : `*@data-major.com`
2. Ajouter l’hôte `cantera-iberica.vercel.app` (et localhost pour le local)

L’app refuse aussi côté serveur toute adresse qui n’est pas `@data-major.com`.

## 2. Neon (déjà provisionné via Vercel)

Dashboard : [Neon resource](https://vercel.com/d/dashboard/integrations/neon/icfg_KwFKtuLFfza02gVYMFZyr8CO/resources/store_HlnULLjVLIQYZ0mx)

Schéma déjà poussé (`drizzle-kit push`). Seed :

```bash
pnpm db:seed
```

## 3. Local

```bash
cp .env.example .env.local
# remplis Clerk + DATABASE_URL

pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

`db:push` applique le schéma. Alternative : coller [`drizzle/0000_init.sql`](drizzle/0000_init.sql) dans la console SQL Neon.

Seed : shortlist + retours Antoine (14/09) et profils déjà proposés en digest.

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | serveur local |
| `pnpm db:push` | pousse le schéma vers Neon |
| `pnpm db:seed` | importe les candidats du brief |
| `pnpm db:studio` | explorateur Drizzle |

## Usage

- **Pipeline** `/` — kanban (à contacter → contacté → répondu → entretien → offre → clos)
- **Ajouter** `/candidates/new` — URL LinkedIn obligatoire, pas de doublon
- **Fiche** `/candidates/[id]` — actions rapides + notes + historique
- **CSV** `/export`

## Hors v1

Digests Headhunter, API agents, liste d’exclusion automatique.
