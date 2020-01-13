import { Kafka, Producer, logLevel } from 'kafkajs';
import nanoid from 'nanoid';
import config from '../../config';
import loggerFactory from '../../utils/logging';
import { IAppEvent } from '../../models/events/IAppEvent';


export class KafkaService {
  protected _kafka: Kafka;
  protected _producer: Producer;

  constructor(getKafka: (config) => Kafka, allowAutoTopicCreation = false) {
    this._kafka = getKafka({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId,
      retry: {
        retries: 6,
      },
      logCreator: (level) => {
        const maxLogLevel: logLevel = parseInt(level);
        const logger = loggerFactory.getLogger('KafkaService');
        return (entry) => {
          if (entry.level > maxLogLevel) return;
          switch (entry.level) {
            case logLevel.ERROR: return logger.error(entry.label, entry.log);
            case logLevel.INFO: return logger.info(entry.label, entry.log);
            case logLevel.WARN: return logger.warn(entry.label, entry.log);
            case logLevel.DEBUG: return logger.debug(entry.label, entry.log);
            default: return logger.info(entry.label, entry.log);
          }
        };
      }
    });
    this._producer = this._kafka.producer({
      allowAutoTopicCreation
    });
  }


  async createTopics() {
    return this._kafka.admin({}).createTopics({
      topics: [
        {
          topic: config.kafkaCommandsTopic,
          numPartitions: 6
        },
        {
          topic: config.kafkaUpdatesTopic,
          numPartitions: 6
        }
      ]
    });
  }

  async send(topic: string, event: IAppEvent) {
    return this.sendMany(topic, [event]);
  }

  async sendMany(topic: string, events: IAppEvent[]) {
    await this._producer.connect();
    return this._producer.send({
      topic,
      messages: events.map(event => ({
        timestamp: event.timestamp.toString(),
        key: event.key || this.getNewKey(),
        value: JSON.stringify(event)
      }))
    });
  }

  async getAllTopics() {
    return this._kafka.admin().fetchTopicMetadata(<any>undefined);
  }

  getNewKey() {
    return nanoid(20);
  }
}