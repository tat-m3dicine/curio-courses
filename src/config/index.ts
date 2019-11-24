import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('Config');
const config: {
  port: number;
  production: boolean;
  kafkaBrokers: string[];
  kafkaProducersGroup: string;
  kafkaClientId: string;
  mongoDbUrl: string;
  kafkaRewardTopic: string;
  authorizedRole: string;
  contributionsScaler: number;
  historyLength: number;
} = <any>{
  port: 80,
  production: false,
  kafkaClientId: 'courses',
  kafkaProducersGroup: 'courses-producers-group',
  kafkaRewardTopic: 'rewards_transactions',
  authorizedRole: 'root',
  contributionsScaler: 5,
  historyLength: 50
};

if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.NODE_ENV) config.production = process.env.NODE_ENV === 'production';
if (process.env.KAFKA_PRODUCERS_GROUP) config.kafkaProducersGroup = process.env.KAFKA_PRODUCERS_GROUP;
if (process.env.KAFKA_CLIENT_ID) config.kafkaClientId = process.env.KAFKA_CLIENT_ID;
if (process.env.AUTHORIZED_ROLE) config.authorizedRole = process.env.AUTHORIZED_ROLE;
if (process.env.CONTRIBUTIONS_SCALER) {
  const scaler = parseInt(process.env.CONTRIBUTIONS_SCALER);
  if (scaler > 1) config.contributionsScaler = scaler;
}
if (process.env.HISTORY_LENGTH) {
  const length = parseInt(process.env.HISTORY_LENGTH);
  if (length > 0) config.historyLength = length;
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

if (process.env.KAFKA_REWARD_TOPIC) {
  config.kafkaRewardTopic = process.env.KAFKA_REWARD_TOPIC;
} else {
  logger.warn(`Missing parameter: KAFKA_REWARD_TOPIC!, setting ${config.kafkaRewardTopic}`);
}

logger.info('Config for the app: %o', config);

export default config;