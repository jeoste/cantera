import { candidateStatuses } from "@/drizzle/schema";
import { STATUS_LABELS } from "@/lib/status";

const statusLines = candidateStatuses
  .map((status) => `${status} (${STATUS_LABELS[status]})`)
  .join(", ");

const profileProperties = {
  fullName: {
    type: "string",
    minLength: 1,
    description: "Nom complet. Obligatoire pour créer un nouveau profil.",
    examples: ["Luis García"],
  },
  linkedinUrl: {
    type: "string",
    format: "uri",
    description:
      "URL de profil LinkedIn `/in/…`. Obligatoire pour créer. Clé d’idempotence : un même URL met à jour au lieu de dupliquer. Accepté avec ou sans https/www ; normalisé côté serveur.",
    examples: ["https://www.linkedin.com/in/luis-garcia"],
  },
  id: {
    type: "string",
    format: "uuid",
    description: "Id interne cantera si déjà connu. Sinon omettre.",
  },
  status: {
    type: "string",
    enum: [...candidateStatuses],
    description: `Colonne pipeline. Valeurs : ${statusLines}. Défaut à la création : to_contact.`,
  },
  currentTitle: { type: "string", examples: ["Data Engineer"] },
  currentCompany: { type: "string", examples: ["Inditex"] },
  locationRaw: { type: "string", examples: ["Málaga, España"] },
  headline: { type: "string" },
  notes: {
    type: "string",
    description: "Contexte (source, langue, salaire, prochaine action). Ajouté à l’historique.",
  },
  salaryRisk: { type: "string" },
  remoteFlag: { type: "string" },
  redFlags: { type: "array", items: { type: "string" } },
  createIfMissing: {
    type: "boolean",
    default: true,
    description: "Créer le profil s’il est inconnu. Défaut true.",
  },
} as const;

const profileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fullName", "linkedinUrl"],
  properties: profileProperties,
};

const resultSchema = {
  type: "object",
  required: ["action", "changes"],
  properties: {
    action: {
      type: "string",
      enum: ["created", "updated", "unchanged", "skipped"],
    },
    candidateId: { type: "string", format: "uuid" },
    fullName: { type: "string" },
    linkedinUrl: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
    reason: { type: "string" },
  },
};

const errorSchema = {
  type: "object",
  required: ["ok", "error"],
  properties: {
    ok: { type: "boolean", const: false },
    error: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    results: { type: "array", items: resultSchema },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "cantera ingest",
    version: "1.1.0",
    summary: "Créer et mettre à jour les profils du vivier Data-Major Ibérica.",
    description:
      "POST /ingest avec `Content-Type: application/json`. Corps canonique : `{ \"profiles\": [ { \"fullName\", \"linkedinUrl\", ... } ] }`. Idempotent sur linkedinUrl. Ne pas scraper LinkedIn : n’envoyer que des données déjà en possession.",
  },
  servers: [
    { url: "https://cantera-iberica.vercel.app", description: "production" },
  ],
  tags: [{ name: "ingest" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/ingest": {
      get: {
        tags: ["ingest"],
        summary: "OpenAPI 3.1 de cette API",
        operationId: "getIngestOpenApi",
        security: [],
        responses: {
          "200": {
            description: "Spécification OpenAPI",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      post: {
        tags: ["ingest"],
        summary: "Créer ou mettre à jour des profils",
        operationId: "ingestProfiles",
        description:
          "Pour ajouter des nouveaux profils, envoyer fullName + linkedinUrl. Si l’URL existe déjà, le profil est mis à jour (pas de doublon). createIfMissing est true par défaut.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/IngestRequest" },
              examples: {
                createMany: {
                  summary: "Ajouter de nouveaux profils",
                  value: {
                    profiles: [
                      {
                        fullName: "Luis García",
                        linkedinUrl: "https://www.linkedin.com/in/luis-garcia",
                        currentTitle: "Data Engineer",
                        currentCompany: "Inditex",
                        locationRaw: "Málaga, España",
                        status: "to_contact",
                        notes: "Français courant, Málaga.",
                      },
                    ],
                  },
                },
                createOne: {
                  summary: "Un seul profil (objet nu, aussi accepté)",
                  value: {
                    fullName: "Ana Pérez",
                    linkedinUrl: "https://www.linkedin.com/in/ana-perez",
                    currentTitle: "Analytics Engineer",
                    status: "to_contact",
                  },
                },
                updateExisting: {
                  summary: "Mettre à jour un profil déjà dans le vivier",
                  value: {
                    profiles: [
                      {
                        fullName: "Luis García",
                        linkedinUrl: "https://www.linkedin.com/in/luis-garcia",
                        status: "too_expensive",
                        notes: "Écart salarial confirmé",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profils mis à jour, aucun nouveau créé",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestResponse" },
              },
            },
          },
          "201": {
            description: "Au moins un profil créé",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestResponse" },
              },
            },
          },
          "400": {
            description: "JSON invalide ou champ manquant",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Bearer token manquant ou invalide",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "415": {
            description: "Content-Type autre que application/json",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": {
            description: "Aucun profil exploitable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestResponse" },
              },
            },
          },
        },
      },
    },
    "/ingest/openapi.json": {
      get: {
        tags: ["ingest"],
        summary: "Même OpenAPI que GET /ingest",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI 3.1",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/ingest/candidates": {
      get: {
        tags: ["ingest"],
        summary: "Lister le vivier (déduplication)",
        operationId: "listCandidates",
        responses: {
          "200": {
            description: "Catalogue actuel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok", "candidates"],
                  properties: {
                    ok: { type: "boolean", const: true },
                    candidates: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "fullName", "linkedinUrl", "status"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          fullName: { type: "string" },
                          linkedinUrl: { type: "string" },
                          status: {
                            type: "string",
                            enum: [...candidateStatuses],
                          },
                          currentTitle: { type: "string", nullable: true },
                          currentCompany: { type: "string", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Bearer token manquant ou invalide",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API token",
        description:
          "Header `Authorization: Bearer <CANTERA_AGENT_TOKEN>`. Jeton Vercel env du projet cantera.",
      },
    },
    schemas: {
      Profile: profileSchema,
      IngestRequest: {
        type: "object",
        additionalProperties: false,
        required: ["profiles"],
        properties: {
          createIfMissing: {
            type: "boolean",
            default: true,
            description:
              "Créer les profils inconnus. true par défaut. Pour créer il faut fullName + linkedinUrl.",
          },
          profiles: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/Profile" },
          },
        },
      },
      IngestResponse: {
        type: "object",
        required: ["ok", "results"],
        properties: {
          ok: { type: "boolean" },
          error: { type: "string" },
          results: { type: "array", items: resultSchema },
        },
      },
      ErrorResponse: errorSchema,
    },
  },
} as const;
