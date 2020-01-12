import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

import { StreamsProcessor } from '../../../src/services/streams/StreamsProcessor';
import { KafkaStreams } from 'kafka-streams';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getKStreamMock } from './KStreamMock';
import { KafkaService } from '../../../src/services/processors/KafkaService';
import { UpdatesProcessor } from '../../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor } from '../../../src/services/processors/CommandsProcessor';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const kafkaStreamsStub = sinon.spy(() => sinon.createStubInstance(KafkaStreams));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

describe('Stream Processor', () => {
  it('Start Stream Processor', async () => {
    const _unitOfWorkStub = new unitOfWorkStub();
    const _kafkaServiceStub = new kafkaServiceStub();
    const _kafkaStreamsStub = new kafkaStreamsStub();
    const _updatesProcessorStub = new updatesProcessorStub();
    const _commandsProcessorStub = new commandsProcessorStub();
    const streamsProcessor = new StreamsProcessor(
      _updatesProcessorStub,
      _commandsProcessorStub,
      _kafkaServiceStub,
      _kafkaStreamsStub,
      () => _unitOfWorkStub
    );
    _kafkaStreamsStub.getKStream = getKStreamMock([], []);
    streamsProcessor.start();
  });
});
