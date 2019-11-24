import { Kafka } from 'kafkajs';
import nanoid from 'nanoid';
import config from '../config';

export class KafkaService {
  protected _kafka: Kafka;

  constructor(allowAutoTopicCreation = false) {
    this._kafka = new Kafka({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId,
      retry: {
        retries: 10
      }
    });
  }

  async createTopics() {
    return this._kafka.admin({}).createTopics({
      topics: [
        {
          topic: config.kafkaRewardTopic,
          numPartitions: 6
        }
      ]
    });
  }

  async getAllTopics() {
    return this._kafka.admin().fetchTopicMetadata(<any>undefined);
  }

  protected getNewKey() {
    return nanoid(20);
  }
}