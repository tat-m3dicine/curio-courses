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
import { getUnitOfWorkHandler, unitOfWorkFactory } from './utils/middlewares/unitOfWorkHandler';
import schoolRoutes from './routes/schools.routes';
import coursesRoutes from './routes/courses.routes';
import sectionsRoutes from './routes/sections.routes';
import providerRoutes from './routes/providers.routes';
import schoolsInviteCodesRoutes from './routes/schools_invite_codes.routes';
import inviteCodesRoutes from './routes/invite_codes.routes';
import externalRoutes from './routes/external.routes';
import { StreamsProcessor } from './services/streams/StreamsProcessor';
import meRoutes from './routes/me.routes';
import { createRedisBus } from '@saal-oryx/message-bus';
import nanoid from 'nanoid';
import { MigrationScripts } from './migration/MigrationScripts';
import { UpdatesProcessor } from './services/processors/UpdatesProcessor';
import { KafkaService } from '@saal-oryx/event-sourcing';
import { Server } from 'http';
import { getFactory } from './services/ServiceFactory';
import { FakeCommandsProcessor } from './services/processors/FakeCommandsProcessor';

const logger = loggerFactory.getLogger('Index');

logger.trace('Started ...');
const app = new Koa();

let server: Server;
(async () => {

  // Singletons ...
  const kafkaService = new KafkaService({
    kafkaBrokers: config.kafkaBrokers,
    kafkaClientId: config.kafkaClientId,
    allowAutoTopicCreation: false
  });

  const commandsBus = createRedisBus(nanoid(10), {
    host: config.redisHost,
    port: config.redisPort
  });
  // Stream
  const updatesProcessor = new UpdatesProcessor(kafkaService);
  const commandsProcessor = new FakeCommandsProcessor(kafkaService, commandsBus, {
    kafkaCommandsTopic: config.kafkaCommandsTopic,
    commandsTimeout: config.commandsTimeout
  });
  const serviceFactory = getFactory(unitOfWorkFactory, commandsProcessor, kafkaService, updatesProcessor);
  commandsProcessor.setServiceFactory(serviceFactory);

  const streamsProcessor = new StreamsProcessor(
    commandsProcessor,
    unitOfWorkFactory,
    updatesProcessor,
    kafkaService,
  );

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
  app.use(schoolsInviteCodesRoutes(commandsProcessor).mount('/schools'));
  app.use(inviteCodesRoutes(commandsProcessor, updatesProcessor).mount('/invite_codes'));
  app.use(providerRoutes(commandsProcessor).mount('/provider'));

  app.use(externalRoutes(commandsProcessor).mount(`/${config.servicePrefix}/external`));

  app.on('error', err => {
    logger.error('app_error', err);
  });

  server = app.listen(config.port, () => {
    logger.info(`application is listening on port ${config.port} ...`);
  });

  try {

    await kafkaService.createTopics([
      { topic: config.kafkaCommandsTopic, numPartitions: 6 },
      { topic: `${config.kafkaCommandsTopic}_db_failed`, numPartitions: 6 },
      { topic: config.kafkaUpdatesTopic, numPartitions: 6 }
    ]);

    // Stream starting ...
    streamsProcessor.start();

    // Migration
    if (config.irpUrl) {
      const migateUsers = new MigrationScripts(updatesProcessor, commandsProcessor);
      await migateUsers.migrateIRPSchools();
      await migateUsers.migrateIRPSections();
      await migateUsers.migrateIRPUsers();
      await migateUsers.prepareCourses();
      await migateUsers.migrateTeachers();
    }
  } catch (err) {
    logger.error('Background Proccesses Error', err);
    process.exit(2);
  }

})().catch((err) => {
  if (server && server.listening) server.close();
  logger.error(err);
  logger.error(err.stack);
  process.exit(1);
});
