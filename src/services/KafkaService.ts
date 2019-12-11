import { Kafka, Producer } from 'kafkajs';
import nanoid from 'nanoid';
import config from '../config';
import { IAppEvent } from '../models/events/IAppEvent';

export class KafkaService {
  protected _kafka: Kafka;
  protected _producer: Producer;

  constructor(allowAutoTopicCreation = false) {
    this._kafka = new Kafka({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId,
      retry: {
        retries: 10
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
        }
      ]
    });
  }

  async send(topic: string, event: IAppEvent) {
    this.sendMany(topic, [event]);
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