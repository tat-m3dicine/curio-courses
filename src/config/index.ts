import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('Config');
const config: {
  port: number;
  production: boolean;
  kafkaBrokers: string[];
  kafkaProducersGroup: string;
  kafkaClientId: string;
  mongoDbUrl: string;
  authorizedRole: string;
  historyLength: number;
  kafkaUpdatesTopic: string;
  kafkaCommandsTopic: string;
  kafkaIRPTopic: string;
  commandsTimeout: number;
  redisHost: string;
  redisPort: number;
  irpUrl: string;
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
  historyLength: 50
};

if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.NODE_ENV) config.production = process.env.NODE_ENV === 'production';
if (process.env.KAFKA_PRODUCERS_GROUP) config.kafkaProducersGroup = process.env.KAFKA_PRODUCERS_GROUP;
if (process.env.KAFKA_CLIENT_ID) config.kafkaClientId = process.env.KAFKA_CLIENT_ID;
if (process.env.AUTHORIZED_ROLE) config.authorizedRole = process.env.AUTHORIZED_ROLE;
if (process.env.COMMANDS_TIMEOUT) config.commandsTimeout = parseInt(process.env.COMMANDS_TIMEOUT);

if (process.env.REDIS_PORT) config.redisPort = parseInt(process.env.REDIS_PORT);
else {
  logger.error('Missing parameter: REDIS_PORT! Exiting...');
  process.exit(1);
}

if (process.env.REDIS_HOST) config.redisHost = process.env.REDIS_HOST;
else {
  logger.error('Missing parameter: REDIS_HOST! Exiting...');
  process.exit(1);
}

if (process.env.KAFKA_BROKERS) {
  config.kafkaBrokers = process.env.KAFKA_BROKERS.split(',').map(x => x.trim());
}
else {
  logger.error('Missing parameter: KAFKA_BROKERS! Exiting...');
  process.exit(1);
}

if (process.env.MONGO_DB_URL) config.mongoDbUrl = process.env.MONGO_DB_URL;
else {
  logger.error('Missing parameter: MONGO_DB_URL! Exiting...');
  process.exit(1);
}

if (process.env.IRP_URL) config.irpUrl = process.env.IRP_URL;

if (process.env.COMMANDS_TIMEOUT) config.commandsTimeout = parseInt(process.env.COMMANDS_TIMEOUT);

logger.info('Config for the app: %o', config);

export default config;
