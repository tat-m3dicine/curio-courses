import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import { RedisMesageBus } from '@saal-oryx/message-bus';
import { KafkaService } from '../../../src/services/processors/KafkaService';
import { CommandsProcessor } from '../../../src/services/processors/CommandsProcessor';

const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const messageBusStub = sinon.spy(() => sinon.createStubInstance(RedisMesageBus));
const eventKey = 'randomKey';
const testData = { test: 'data' };

describe('Commands Processor', () => {
  let commandsProcessor: CommandsProcessor;
  const _eventsMap = {};

  beforeEach(() => {
    kafkaServiceStub.send = () => undefined;
    kafkaServiceStub.getNewKey = () => eventKey;
    messageBusStub.on = (command, method) => _eventsMap[command] = method;
    messageBusStub.publish = event => _eventsMap[event.name](event);
    commandsProcessor = new CommandsProcessor(kafkaServiceStub, messageBusStub);
  });

  it('should succeed to send a command and resolve it (two resolves)', async () => {
    setImmediate(() => commandsProcessor.resolveCommand(eventKey, testData));
    setImmediate(() => commandsProcessor.resolveCommand(eventKey, testData));
    const result = await commandsProcessor.sendCommand('service', () => Promise.resolve());
    expect(result.done).equal(true);
    expect(result.data).equal(testData);
  });

  it('should succeed to send a command and reject it (two rejects)', async () => {
    setImmediate(() => commandsProcessor.rejectCommand(eventKey, <any>testData));
    setImmediate(() => commandsProcessor.rejectCommand(eventKey, <any>testData));
    try {
      await commandsProcessor.sendCommand('service', () => Promise.resolve());
    } catch (error) {
      expect(error).equal(testData);
    }
  });

  it('should succeed to send a command and force resolve due to timeout', async () => {
    commandsProcessor = new CommandsProcessor(kafkaServiceStub, messageBusStub, { commandsTimeout: 5 });
    setTimeout(() => commandsProcessor.resolveCommand(eventKey, undefined), 15).unref();
    const result = await commandsProcessor.sendCommand('service', () => Promise.resolve(), testData);
    expect(result.done).equal(false);
    expect(result.data[0]).equal(testData);
  });

  it('should succeed to send one commands without waiting (async)', async () => {
    const result = await commandsProcessor.sendCommandAsync('service', () => Promise.resolve(), testData);
    expect(result.data[0]).equal(testData);
  });

  it('should succeed to send many commands without waiting (async)', async () => {
    commandsProcessor.kafkaService.sendMany = () => <any>undefined;
    const result = await commandsProcessor.sendManyCommandsAsync('service', () => Promise.resolve(), [[testData]]);
    expect(result).to.have.lengthOf(1);
    expect(result[0].data[0]).equal(testData);
  });
});
