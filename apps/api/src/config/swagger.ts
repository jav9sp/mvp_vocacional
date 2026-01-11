import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "API",
      version: "1.0.0",
      description: "REST API (Express + Sequelize + Typescript)",
    },
    servers: [{ url: "http://localhost:4000", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "string", example: "Forbidden" },
            details: { type: "object", nullable: true },
          },
          required: ["ok", "error"],
        },

        Test: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            key: { type: "string", example: "inapv" },
            version: { type: "string", example: "v1" },
            name: { type: "string", example: "INAPV" },
          },
          required: ["id", "key", "version", "name"],
        },

        Period: {
          type: "object",
          properties: {
            id: { type: "integer", example: 10 },
            name: { type: "string", example: "Admisión 2026 - Enero" },
            status: {
              type: "string",
              enum: ["draft", "active", "closed"],
              example: "active",
            },
            startAt: { type: "string", format: "date-time", nullable: true },
            endAt: { type: "string", format: "date-time", nullable: true },
          },
          required: ["id", "name", "status", "startAt", "endAt"],
        },

        AttemptSummary: {
          type: "object",
          properties: {
            id: { type: "integer", example: 99 },
            periodId: { type: "integer", example: 10 },
            status: {
              type: "string",
              enum: ["in_progress", "finished"],
              example: "in_progress",
            },
            answeredCount: { type: "integer", example: 12 },
            finishedAt: { type: "string", format: "date-time", nullable: true },
          },
          required: ["id", "periodId", "status", "answeredCount", "finishedAt"],
        },

        Question: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            externalId: { type: "string", example: "Q001" },
            text: {
              type: "string",
              example: "Me gusta resolver problemas complejos.",
            },
            area: { type: "string", example: "Ciencias" },
            dim: {
              type: "array",
              items: { type: "string" },
              example: ["interes"],
            },
            orderIndex: { type: "integer", example: 1 },
          },
          required: ["id", "externalId", "text", "area", "dim", "orderIndex"],
        },

        ResultPayload: {
          type: "object",
          properties: {
            scoresByArea: {
              type: "object",
              additionalProperties: { type: "number" },
            },
            scoresByAreaDim: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  interes: { type: "number" },
                  aptitud: { type: "number" },
                  total: { type: "number" },
                },
                required: ["interes", "aptitud", "total"],
              },
            },
            topAreas: { type: "array", items: { type: "string" } },
            createdAt: { type: "string", format: "date-time" },
          },
          required: [
            "scoresByArea",
            "scoresByAreaDim",
            "topAreas",
            "createdAt",
          ],
        },
      },
    },
  },
  // Ajusta estos globs a tu estructura real:
  apis: ["src/routes/auth/*.ts", "src/routes/student/*.ts", "src/routes/*.ts"],
});
