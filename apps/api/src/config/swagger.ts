import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  swaggerDefinition: {
    openapi: "3.0.2",
    tags: [
      {
        name: "Users",
        description: "API operations related to users",
      },
    ],
    info: {
      title: "REST API Node.js / Express / Typescript",
      version: "1.0.0",
      description: "API Docs for Users",
    },
  },
  apis: ["./src/index.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
