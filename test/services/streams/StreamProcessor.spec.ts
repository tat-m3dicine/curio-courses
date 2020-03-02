import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { StreamsProcessor } from '../../../src/services/streams/StreamsProcessor';
import { KafkaStreams } from 'kafka-streams';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { UpdatesProcessor } from '../../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const kafkaStreamsStub = sinon.spy(() => sinon.createStubInstance(KafkaStreams));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

describe('Stream Processor', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let _kafkaStreamsStub: any;
  let _updatesProcessorStub: any;
  let _commandsProcessorStub: any;
  let streamsProcessor: StreamsProcessor;

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    _kafkaStreamsStub = new kafkaStreamsStub();
    _updatesProcessorStub = new updatesProcessorStub();
    _commandsProcessorStub = new commandsProcessorStub();
    streamsProcessor = new StreamsProcessor(
      _commandsProcessorStub,
      () => _unitOfWorkStub,
      _updatesProcessorStub,
      _kafkaServiceStub
    );
  });

  it('should succeed to start streams', async () => {
    // tslint:disable-next-line: no-string-literal
    streamsProcessor['_getStreams'] = () => [{ start: () => true }];
    const result = await streamsProcessor.start();
    expect(result).deep.equal([true]);
  });

  it('should succeed to instantiate stream objects', () => {
    // tslint:disable-next-line: no-string-literal
    const result = streamsProcessor['_getStreams']();
    // tslint:disable-next-line: no-string-literal
    streamsProcessor['_getUsersService']();
    expect(result).to.have.lengthOf(2);
  });
});
