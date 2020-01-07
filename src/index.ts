import Koa from 'koa';
import config from './config';
import koaBody from 'koa-body';
import loggerFactory from './utils/logging';
import {
  tokenHandler,
  errorHandler,
  healthCheckHandler,
  corsHandler
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
import meRoutes from './routes/me.routes';

const logger = loggerFactory.getLogger('Index');

logger.trace('Started ...');
const app = new Koa();

let server: import('http').Server;
(async () => {

  // Singletons ...
  const kafkaService = new KafkaService();
  // Stream
  const updatesProcessor = new UpdatesProcessor(kafkaService);
  const commandsProcessor = new CommandsProcessor(kafkaService);
  const streamsProcessor = new StreamsProcessor(updatesProcessor, commandsProcessor, kafkaService);

  app.proxy = true;
  app.use(loggerHandler);
  app.use(healthCheckHandler);
  app.use(corsHandler);

  // Error Handler!
  app.use(errorHandler);

  // Unit of work
  app.use(getUnitOfWorkHandler());

  // Token Parser ...
  app.use(tokenHandler);

  // Body Parser ...
  app.use(koaBody());

  // Routes ...
  app.use(meRoutes(commandsProcessor, updatesProcessor).mount('/me'));
  app.use(schoolRoutes(commandsProcessor, kafkaService).mount('/schools'));
  app.use(sectionsRoutes(commandsProcessor).mount('/schools'));
  app.use(coursesRoutes(commandsProcessor, updatesProcessor).mount('/schools'));
  app.use(inviteCodesRoutes(commandsProcessor).mount('/schools'));
  app.use(providerRoutes(commandsProcessor).mount('/provider'));

  app.on('error', err => {
    logger.error('app_error', err);
  });

  server = app.listen(config.port, () => {
    logger.info(`application is listening on port ${config.port} ...`);
  });

  try {

    await kafkaService.createTopics();

    // Migration
    if (config.irpUrl) {
      const migateUsers = new MigrationScripts(updatesProcessor, commandsProcessor);
      await migateUsers.migrateIRPSchools();
      await migateUsers.migrateIRPUsersAndSections();
      await migateUsers.migrateTeachers();
    }

    // Stream starting ...
    await streamsProcessor.start();

  } catch (err) {
    logger.error('Background Proccesses Error', err);
  }

})().catch((err) => {
  if (server && server.listening) server.close();
  logger.error(err);
  logger.error(err.stack);
  process.exit(1);
});
