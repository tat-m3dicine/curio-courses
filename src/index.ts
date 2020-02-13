import Koa from 'koa';
import config from './config';
import { getNativeConfig } from './config/native';
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
import inviteCodesRoutes from './routes/invite_codes.routes';
import { StreamsProcessor } from './services/streams/StreamsProcessor';
import meRoutes from './routes/me.routes';
import { createRedisBus } from '@saal-oryx/message-bus';
import nanoid from 'nanoid';
import { KafkaStreams } from 'kafka-streams';
import { MigrationScripts } from './migration/MigrationScripts';
import { UpdatesProcessor } from './services/processors/UpdatesProcessor';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { Server } from 'http';

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
  const kafkaStreams = new KafkaStreams(
    <any>getNativeConfig('CoursesCommandsStreams', 'CoursesCommandsStreams')
  );
  const commandsBus = createRedisBus(nanoid(10), {
    host: config.redisHost,
    port: config.redisPort
  });
  // Stream
  const updatesProcessor = new UpdatesProcessor(kafkaService);
  const commandsProcessor = new CommandsProcessor(kafkaService, commandsBus, {
    kafkaCommandsTopic: config.kafkaCommandsTopic,
    commandsTimeout: config.commandsTimeout
  });
  const streamsProcessor = new StreamsProcessor(
    commandsProcessor,
    kafkaStreams,
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
  app.use(inviteCodesRoutes(commandsProcessor).mount('/schools'));
  app.use(providerRoutes(commandsProcessor).mount('/provider'));

  app.on('error', err => {
    logger.error('app_error', err);
  });

  server = app.listen(config.port, () => {
    logger.info(`application is listening on port ${config.port} ...`);
  });

  try {

    await kafkaService.createTopics([
      { topic: config.kafkaCommandsTopic, numPartitions: 6 },
      { topic: config.kafkaIRPTopic, numPartitions: 6 }
    ]);

    // Stream starting ...
    await streamsProcessor.start();

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
  }

})().catch((err) => {
  if (server && server.listening) server.close();
  logger.error(err);
  logger.error(err.stack);
  process.exit(1);
});
