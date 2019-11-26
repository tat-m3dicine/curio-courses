import Koa from 'koa';
import koaBody from 'koa-body';
import config from './config';
import { StreamsProcessor } from './services/streams/StreamsProcessor';

import loggerFactory from './utils/logging';

import {
  tokenHandler,
  errorHandler,
  healthCheckHandler,
} from './utils/middlewares';
import { loggerHandler } from './utils/middlewares/loggerHandler';
import { getUnitOfWorkHandler } from './utils/middlewares/unitOfWorkHandler';

import schoolRoutes from './routes/schools.routes';
import { KafkaService } from './services/KafkaService';
import sectionsRoutes from './routes/sections.routes';
import { CommandsProcessor } from './services/CommandsProcessor';

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

  const commandsProcessor = new CommandsProcessor(kafkaService);
  const streamsProcessor = new StreamsProcessor(kafkaService, commandsProcessor);
  await streamsProcessor.start();

  app.proxy = true;
  app.use(loggerHandler);
  app.use(healthCheckHandler);

  // Error Handler!
  app.use(errorHandler);

  // Unit of work
  app.use(getUnitOfWorkHandler());

  server = app.listen(config.port, () => {
    logger.info(`application is listening on port ${config.port} ...`);
  });

  // Token Parser ...
  app.use(tokenHandler);

  // Body Parser ...
  app.use(koaBody());



  // Routes ...
  app.use(schoolRoutes(commandsProcessor).mount('/schools'));
  app.use(sectionsRoutes().mount('/schools'));

  app.on('error', err => {
    logger.error('app_error', err);
  });

})().catch((err) => {
  if (server && server.listening) server.close();
  logger.error(err);
  logger.error(err.stack);
  process.exit(1);
});
