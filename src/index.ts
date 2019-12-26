import Koa from 'koa';
import config from './config';
import koaBody from 'koa-body';
import loggerFactory from './utils/logging';
import {
  tokenHandler,
  errorHandler,
  healthCheckHandler,
} from './utils/middlewares';
import { loggerHandler } from './utils/middlewares/loggerHandler';
import { getUnitOfWorkHandler } from './utils/middlewares/unitOfWorkHandler';
import schoolRoutes from './routes/schools.routes';
import coursesRoutes from './routes/courses.routes';
import sectionsRoutes from './routes/sections.routes';
import providerRoutes from './routes/providers.routes';
import inviteCodesRoutes from './routes/invite_codes.routes';
import { KafkaService } from './services/KafkaService';
import { MigrationScripts } from './services/MigrationScripts';
import { CommandsProcessor } from './services/CommandsProcessor';
import { StreamsProcessor } from './services/streams/StreamsProcessor';
import { UpdatesProcessor } from './services/UpdatesProcessor';

const logger = loggerFactory.getLogger('Index');

logger.trace('Started ...');
const app = new Koa();

let server: import('http').Server;
(async () => {

  // Singletons ...
  const kafkaService = new KafkaService();
  try {
    await kafkaService.createTopics();
  } catch (err) {
    logger.warn('createTopics', err);
  }

  // Stream
  const updatesProcessor = new UpdatesProcessor(kafkaService);
  const commandsProcessor = new CommandsProcessor(kafkaService);
  const streamsProcessor = new StreamsProcessor(updatesProcessor, commandsProcessor);
  await streamsProcessor.start();

  app.proxy = true;
  app.use(loggerHandler);
  app.use(healthCheckHandler);

  // Error Handler!
  app.use(errorHandler);

  // Unit of work
  app.use(getUnitOfWorkHandler());

  // Migration
  if (config.irpUrl) {
    try {
      const migateUsers = new MigrationScripts(updatesProcessor, commandsProcessor);
      await Promise.all([
        migateUsers.migrateIRPUsersAndSections(),
        migateUsers.migrateIRPSchools()
      ]);
    } catch (err) {
      logger.error('Migration errors', err);
    }
  }

  server = app.listen(config.port, () => {
    logger.info(`application is listening on port ${config.port} ...`);
  });

  // Token Parser ...
  app.use(tokenHandler);

  // Body Parser ...
  app.use(koaBody());

  // Routes ...
  app.use(schoolRoutes(commandsProcessor, kafkaService).mount('/schools'));
  app.use(sectionsRoutes(commandsProcessor).mount('/schools'));
  app.use(coursesRoutes(commandsProcessor, updatesProcessor).mount('/schools'));
  app.use(inviteCodesRoutes(commandsProcessor).mount('/schools'));
  app.use(providerRoutes(commandsProcessor).mount('/provider'));

  app.on('error', err => {
    logger.error('app_error', err);
  });

})().catch((err) => {
  if (server && server.listening) server.close();
  logger.error(err);
  logger.error(err.stack);
  process.exit(1);
});
