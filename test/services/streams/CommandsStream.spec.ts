import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { UpdatesProcessor } from '../../../src/services/UpdatesProcessor';
import { CommandsProcessor } from '../../../src/services/CommandsProcessor';
import { CommandsStream } from '../../../src/services/streams/CommandsStream';
import { KafkaStreams } from 'kafka-streams';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { IAppEvent } from '../../../src/models/events/IAppEvent';
import { NotFoundError } from '../../../src/exceptions/NotFoundError';
import { Repo } from '../../../src/repositories/RepoNames';
import { ServerError } from '../../../src/exceptions/ServerError';
import { InvalidRequestError } from '../../../src/exceptions/InvalidRequestError';

const testEvent: IAppEvent = { data: [], event: '', timestamp: Date.now(), v: '1.0', key: 'abc' };
const format = (event: IAppEvent) => ({ value: JSON.stringify(event) });
const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaStreamsStub = sinon.spy(() => sinon.createStubInstance(KafkaStreams));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

describe('Commands Stream', () => {
  let _unitOfWorkStub: any;
  let _kafkaStreamsStub: any;
  let _updatesProcessorStub: any;
  let _commandsProcessorStub: any;
  let commandsStream: CommandsStream;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);
  const getCommandsStream = (events: IAppEvent[], failedEvents?: IAppEvent[]) => {
    _kafkaStreamsStub.getKStream = (topic: string) => {
      let processed: any[] = [];
      return {
        kafka: { consumer: { commitLocalOffsetsForTopic: () => undefined } },
        start: (done, error) => {
          processed.length > 0 ? done() : error();
          return Promise.all(processed.map(result => result.source.source.value));
        },
        map: map => ({
          concatMap: concatMap => ({
            filter: filter => !topic.endsWith('failed') ?
              {
                to: to => events && (processed = events.map(format).map(map).map(concatMap).map(filter))
              } : {
                concatMap: concatMap2 => ({
                  to: to => failedEvents && (processed = failedEvents.map(format).map(map).map(concatMap).map(filter).map(concatMap2))
                })
              }
          })
        })
      };
    };
    return new CommandsStream(
      _kafkaStreamsStub,
      _updatesProcessorStub,
      _commandsProcessorStub,
      async () => _unitOfWorkStub,
      { writeToFailedDelay: 5 }
    );
  };

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaStreamsStub = new kafkaStreamsStub();
    _updatesProcessorStub = new updatesProcessorStub();
    _commandsProcessorStub = new commandsProcessorStub();
  });

  it('should succeed to get stream services', async () => {
    commandsStream = new CommandsStream(_kafkaStreamsStub, _updatesProcessorStub, _commandsProcessorStub, async () => _unitOfWorkStub);
    const result = await commandsStream.getServices();
    expect(result.services.size).gt(0);
  });

  it('should succeed to run streams with no events', async () => {
    commandsStream = getCommandsStream([], []);
    const result = await commandsStream.start();
    expect(result).deep.equal([[], []]);
  });

  it('should fail to process events due to no data payload', async () => {
    const event: IAppEvent = { ...testEvent, data: undefined };
    commandsStream = getCommandsStream([event]);
    const [stream] = await commandsStream.start();
    expect(stream).deep.equal([undefined]);
  });

  it('should fail to process event due to function not found in service', async () => {
    let error: any;
    const event: IAppEvent = { ...testEvent, event: 'doNothing_schools' };
    _commandsProcessorStub.rejectCommand = (_, err) => error = err;
    commandsStream = getCommandsStream([event]);
    await commandsStream.start();
    expect(error).instanceOf(ServerError);
  });

  it('should fail to process event due to general service call error', async () => {
    let error: any;
    const event: IAppEvent = { ...testEvent, event: 'doDelete_schools' };
    repositoryReturns(Repo.schools, { delete: () => { throw new NotFoundError('School not found!'); } });
    _commandsProcessorStub.rejectCommand = (_, err) => error = err;
    commandsStream = getCommandsStream([event]);
    await commandsStream.start();
    expect(error).instanceOf(NotFoundError);
  });

  it('should fail to process event due to item already exists error', async () => {
    let error: any;
    const event: IAppEvent = { ...testEvent, event: 'doAdd_schools' };
    repositoryReturns(Repo.schools, { add: () => { throw { code: 11000 }; } });
    _commandsProcessorStub.rejectCommand = (_, err) => error = err;
    commandsStream = getCommandsStream([event]);
    await commandsStream.start();
    expect(error).instanceOf(InvalidRequestError);
  });

  it('should fail to process event due to item already exists error', async () => {
    const event: IAppEvent = { ...testEvent, event: 'doAdd_schools' };
    repositoryReturns(Repo.schools, { add: () => { throw 500; } });
    commandsStream = getCommandsStream([event]);
    const [stream] = await commandsStream.start();
    expect(JSON.parse(stream[0].value).error).equal('500');
  });

  it('should succeed to process event and resolve command', async () => {
    let done = false;
    const event: IAppEvent = { ...testEvent, event: 'doAdd_schools', data: [{ date: '2020-01-08T14:37:51.407Z' }] };
    repositoryReturns(Repo.schools, { add: () => true });
    _commandsProcessorStub.resolveCommand = (_, result) => done = result;
    commandsStream = getCommandsStream([event]);
    await commandsStream.start();
    expect(done).equal(true);
  });

  it('should succeed to process failed event and resolve command', async () => {
    let done = false;
    const event: IAppEvent = { ...testEvent, event: 'doAdd_schools' };
    repositoryReturns(Repo.schools, { add: () => true });
    _commandsProcessorStub.resolveCommand = (_, result) => done = result;
    commandsStream = getCommandsStream([], [event]);
    await commandsStream.start();
    expect(done).equal(true);
  });
});
