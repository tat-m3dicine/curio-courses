import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { Kafka, logLevel } from 'kafkajs';
import { IAppEvent } from '../../../src/models/events/IAppEvent';
import { KafkaService } from '../../../src/services/processors/KafkaService';

const kafkaStub = sinon.spy(() => sinon.createStubInstance(Kafka));
const testEvent: IAppEvent = { data: [], event: '', timestamp: Date.now(), v: '1.0' };

describe('Kafka Service', () => {
  let _kafkaStub: any;
  let kafkaService: KafkaService;
  let getLogger: any;

  beforeEach(() => {
    _kafkaStub = new kafkaStub();
    _kafkaStub.producer = () => ({ connect: () => true, send: event => event });
    kafkaService = new KafkaService(({ logCreator }) => {
      getLogger = logCreator;
      return _kafkaStub;
    });
  });

  it('should succeed to create kafka topics', async () => {
    _kafkaStub.admin = () => ({ createTopics: () => true });
    const result = await kafkaService.createTopics();
    expect(result).equal(true);
  });

  it('should succeed to send one kafka event', async () => {
    const { messages: result } = <any>await kafkaService.send('test_topic', testEvent);
    expect(result).to.have.length(1);
    expect(result[0].key).not.equal(undefined);
  });

  it('should succeed to send many kafka events', async () => {
    const { messages: result } = <any>await kafkaService.sendMany('test_topic', [testEvent, testEvent]);
    expect(result).to.have.length(2);
  });

  it('should succeed to get all kafka topics', async () => {
    _kafkaStub.admin = () => ({ fetchTopicMetadata: () => true });
    const result = await kafkaService.getAllTopics();
    expect(result).equal(true);
  });

  it('should succeed to create logger (all levels)', async () => {
    const log = getLogger(logLevel.DEBUG);
    log({ level: logLevel.ERROR });
    log({ level: logLevel.INFO });
    log({ level: logLevel.WARN });
    log({ level: logLevel.DEBUG });
    log({ level: logLevel.NOTHING });
    log({ level: 6 });
  });
});
