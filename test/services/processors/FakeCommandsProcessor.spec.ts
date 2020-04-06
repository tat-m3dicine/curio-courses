import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import { KafkaService, CommandsProcessor } from '@saal-oryx/event-sourcing';
import { FakeCommandsProcessor } from '../../../src/services/processors/FakeCommandsProcessor';
import { IMessageBus } from '@saal-oryx/event-sourcing/dist/interfaces/IMessageBus';
chai.use(require('sinon-chai'));

const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const event = {
  event: 'event_event',
  timestamp: Date.now(),
  data: [],
  v: '1.0.0',
  key: '12345'
}

describe('Updates Processor', () => {
  let _kafkaServiceStub: any;
  let _commandsProcessorStub: any;
  let fakeCommandsProcessor: FakeCommandsProcessor;
  let _messageBusStub: IMessageBus;

  beforeEach(() => {
    // _messageBusStub.on = (_)
    // fakeCommandsProcessor.setServiceFactory(());
    _kafkaServiceStub = new kafkaServiceStub();
    _commandsProcessorStub = new commandsProcessorStub();
    fakeCommandsProcessor = new FakeCommandsProcessor(_kafkaServiceStub, _messageBusStub, { kafkaCommandsTopic: '', commandsTimeout: 6 });
  });

  // giving me TypeError: Cannot set property 'on' of undefined

});