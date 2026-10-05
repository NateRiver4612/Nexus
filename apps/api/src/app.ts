import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import auth from './auth';
import { env } from './env';
import { handleHttpError } from './errors';
import { docConfig, registerSecuritySchemes } from './openapi';
import { aiRoutes } from './modules/ai/routes';
import { artifactRoutes } from './modules/artifacts/routes';
import { deliverableRoutes } from './modules/deliverables/routes';
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
      origin: env.WEB_BASE_URL,
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
  const v1 = new OpenAPIHono()
    .route('/ai', aiRoutes())
    .route('/projects', projectRoutes())
    .route('/planner', plannerRoutes())
    .route('/artifacts', artifactRoutes())
    .route('/deliverables', deliverableRoutes())
    .route('/knowledge', knowledgeRoutes())
    .route('/notifications', notificationRoutes())
    .route('/search', searchRoutes())
    .route('/users', userRoutes());

  return app.route('/api/v1', v1);
}
