import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import { KafkaService } from '@saal-oryx/event-sourcing';
import { FakeCommandsProcessor } from '../../../src/services/processors/FakeCommandsProcessor';
import { tryAndExpect } from '../../utils/tryAndExpect';
import { AppError } from '../../../src/exceptions/AppError';
chai.use(require('sinon-chai'));

const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));

describe('Fake Commands Processor', () => {
  let _messageBusStub: any;
  let _kafkaServiceStub: any;
  let fakeCommandsProcessor: FakeCommandsProcessor;

  beforeEach(() => {
    _messageBusStub = { on: () => undefined };
    _kafkaServiceStub = new kafkaServiceStub();
    fakeCommandsProcessor = new FakeCommandsProcessor(_kafkaServiceStub, _messageBusStub, { kafkaCommandsTopic: '', commandsTimeout: 6 });
  });

  it('should fail to send command if service was not found', async () => {
    fakeCommandsProcessor.setServiceFactory(async () => undefined);
    await tryAndExpect(() => fakeCommandsProcessor.sendCommand('service', <any>{ name: 'method' }, 'data'), AppError);
  });

  it('should succeed to send command and return results', async () => {
    fakeCommandsProcessor.setServiceFactory(async service => ({ method: () => true, dispose: () => undefined }));
    const result = await fakeCommandsProcessor.sendCommand('service', <any>{ name: 'method' }, 'data');
    expect(result.data).equal(true);
  });
});