

const config: {
  port: number;
  production: boolean;
  kafkaBrokers: string[];
  kafkaProducersGroup: string;
  kafkaClientId: string;
  mongoDbUrl: string;
  authorizedRole: string;
  guestSchoolId: string;
  servicePrefix: string;
  historyLength: number;
  kafkaUpdatesTopic: string;
  kafkaCommandsTopic: string;
  kafkaIRPTopic: string;
  commandsTimeout: number;
  redisHost: string;
  redisPort: number;
  irpUrl: string;
  retryFailures: boolean;
} = <any>{
  port: 80,
  production: false,
  kafkaClientId: 'courses',
  kafkaProducersGroup: 'courses-producers-group',
  kafkaUpdatesTopic: 'courses_updates',
  kafkaCommandsTopic: 'courses_commands',
  kafkaIRPTopic: 'UserUpdate',
  commandsTimeout: 3 * 1000,
  authorizedRole: 'root',
  guestSchoolId: 'FREE_SCHOOL',
  servicePrefix: 'courses',
  historyLength: 50,
  retryFailures: false
};

if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.NODE_ENV) config.production = process.env.NODE_ENV === 'production';
if (process.env.KAFKA_PRODUCERS_GROUP) config.kafkaProducersGroup = process.env.KAFKA_PRODUCERS_GROUP;
if (process.env.KAFKA_CLIENT_ID) config.kafkaClientId = process.env.KAFKA_CLIENT_ID;
if (process.env.AUTHORIZED_ROLE) config.authorizedRole = process.env.AUTHORIZED_ROLE;
if (process.env.COMMANDS_TIMEOUT) config.commandsTimeout = parseInt(process.env.COMMANDS_TIMEOUT);
if (process.env.RETRY_FAILURES) config.retryFailures = process.env.RETRY_FAILURES === 'true';

if (process.env.NODE_ENV === 'test') {
  process.env.LOGGER_CONFIG = '{"disableClustering":true,"appenders":{"out":{"type":"stdout","layout":{"type":"pattern","pattern":"%[ [%d] [%p] %] %c - %x{correlationId} - %m"}}},"categories":{"default":{"appenders":["out"],"level":"fatal"}}}';
}

import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('Config');

if (process.env.REDIS_PORT) config.redisPort = parseInt(process.env.REDIS_PORT);
else if (process.env.NODE_ENV !== 'test') {
  logger.error('Missing parameter: REDIS_PORT! Exiting...');
  process.exit(1);
}

if (process.env.REDIS_HOST) config.redisHost = process.env.REDIS_HOST;
else if (process.env.NODE_ENV !== 'test') {
  logger.error('Missing parameter: REDIS_HOST! Exiting...');
  process.exit(1);
}

if (process.env.KAFKA_BROKERS) {
  config.kafkaBrokers = process.env.KAFKA_BROKERS.split(',').map(x => x.trim());
}
else if (process.env.NODE_ENV !== 'test') {
  logger.error('Missing parameter: KAFKA_BROKERS! Exiting...');
  process.exit(1);
}

if (process.env.MONGO_DB_URL) config.mongoDbUrl = process.env.MONGO_DB_URL;
else if (process.env.NODE_ENV !== 'test') {
  logger.error('Missing parameter: MONGO_DB_URL! Exiting...');
  process.exit(1);
}

if (process.env.IRP_URL) config.irpUrl = process.env.IRP_URL;
if (process.env.GUEST_SCHOOL_ID) config.guestSchoolId = process.env.GUEST_SCHOOL_ID;
if (process.env.SERVICE_PREFIX) config.servicePrefix = process.env.SERVICE_PREFIX;
if (process.env.COMMANDS_TIMEOUT) config.commandsTimeout = parseInt(process.env.COMMANDS_TIMEOUT);

logger.info('Config for the app: %o', config);

export default config;
