import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import auth from './shared/auth';
import { handleHttpError } from './shared/errors';
import { docConfig, registerSecuritySchemes } from './shared/openapi';
import { artifactRoutes } from './modules/artifacts/routes';
import { knowledgeRoutes } from './modules/knowledge/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { plannerRoutes } from './modules/planner/routes';
import { projectRoutes } from './modules/projects/routes';
import { searchRoutes } from './modules/search/routes';
import { userRoutes } from './modules/users/routes';

export function createApp() {
  const app = new OpenAPIHono();

  app.use(logger());
  app.use(
    '*',
    cors({
      origin: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
      credentials: true,
    }),
  );

  app.onError((err, c) => handleHttpError(c, err));

  registerSecuritySchemes(app);

  // Docs
  app.doc('/doc', docConfig());
  app.get('/docs', swaggerUI({ url: '/doc' }));

  // Better Auth
  app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

  // Health
  app.get('/health', (c) =>
    c.json({
      name: 'nexus-api',
      version: '0.1.0',
      status: 'ok',
      time: new Date().toISOString(),
    }),
  );

  // Modules
  const v1 = new OpenAPIHono();
  v1.route('/projects', projectRoutes());
  v1.route('/planner', plannerRoutes());
  v1.route('/artifacts', artifactRoutes());
  v1.route('/knowledge', knowledgeRoutes());
  v1.route('/notifications', notificationRoutes());
  v1.route('/search', searchRoutes());
  v1.route('/users', userRoutes());
  app.route('/api/v1', v1);

  return app;
}

const port = Number(process.env.PORT ?? 3001);
const server = Bun.serve({ port, fetch: createApp().fetch });
console.log(`@nexus/api running on http://localhost:${server.port}`);
