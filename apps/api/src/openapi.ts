import type { OpenAPIHono } from '@hono/zod-openapi';

export const bearerSecurity = [{ Bearer: [] }];

export function registerSecuritySchemes(app: OpenAPIHono) {
  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: 'Better Auth session token',
  });
}

export function docConfig() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Nexus API',
      version: '0.1.0',
      description: 'Modular monolith API for the Nexus workspace.',
    },
    servers: [
      {
        url: process.env.API_BASE_URL ?? 'http://localhost:3001',
        description: 'Local development',
      },
    ],
  };
}
