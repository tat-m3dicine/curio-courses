import config from '../../config';
import { KafkaStreams, KStream } from 'kafka-streams';
import loggerFactory from '../../utils/logging';
import { getDbClient } from '../../utils/getDbClient';
import { fromPromise, await } from 'most';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../../repositories/RepositoryFactory';
import { IAppEvent } from '../../models/events/IAppEvent';
import { CommandsProcessor } from '../CommandsProcessor';
import { SchoolsService } from '../SchoolsService';
import { SectionsService } from '../SectionsService';
import { CoursesService } from '../CoursesService';
import { ProvidersService } from '../ProviderService';
import { ServerError } from '../../exceptions/ServerError';
import { AppError } from '../../exceptions/AppError';
import { InvalidRequestError } from '../../exceptions/InvalidRequestError';
import { InviteCodesService } from '../InviteCodesService';
import { UpdatesProcessor } from '../UpdatesProcessor';

const logger = loggerFactory.getLogger('CommandsStream');

export class CommandsStream {

  protected _stream: KStream;
  protected _failuresStream: KStream;


  constructor(
    protected _kafkaStreams: KafkaStreams,
    protected _updatesProcessor: UpdatesProcessor,
    protected _commandsProcessor: CommandsProcessor
  ) {
    logger.debug('Init ...');
    this._stream = _kafkaStreams.getKStream(config.kafkaCommandsTopic);
    this._failuresStream = _kafkaStreams.getKStream(`${config.kafkaCommandsTopic}_db_failed`);
  }

  async getServices() {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: true });
    const services = new Map<string, object>();
    services.set('schools', new SchoolsService(uow, this._commandsProcessor, this._commandsProcessor.kafkaService));
    services.set('sections', new SectionsService(uow, this._commandsProcessor));
    services.set('courses', new CoursesService(uow, this._commandsProcessor, this._updatesProcessor));
    services.set('inviteCodes', new InviteCodesService(uow, this._commandsProcessor));
    services.set('providers', new ProvidersService(uow, this._commandsProcessor));
    return { services, uow };
  }

  async start() {
    return Promise.all([this.rawStart(), this.failuresStart()]);
  }

  protected async rawStart() {
    this._stream
      .map(mapToProperJSON)
      .concatMap(message => {
        logger.debug('raw-db-sink', message.offset, message.value.key);
        const result = this.process(message).then(async result => {
          // tslint:disable-next-line: no-string-literal
          const client = this._stream['kafka']['consumer'];
          await client.commitLocalOffsetsForTopic(config.kafkaCommandsTopic);
          return result;
        });
        return fromPromise(result);
      })
      .filter(v => v)
      .to(`${config.kafkaCommandsTopic}_commands_db_failed`);
    return this._stream.start(
      () => {
        logger.info('Raw Stream Ready ...');
      }, (error) => {
        logger.error('Raw Stream Error', error);
      });
  }

  protected async failuresStart() {
    this._failuresStream
      .map(mapToProperJSON)
      .concatMap(message => {
        logger.debug('failed-db-sink', message.offset, message.value.key);
        const result = this.process(message)
          .then(async processingResults => {
            // tslint:disable-next-line: no-string-literal
            const client = this._failuresStream['kafka']['consumer'];
            await client.commitLocalOffsetsForTopic(`${config.kafkaCommandsTopic}_db_failed`);
            logger.debug('failed-db-sink commited', message.offset);
            return processingResults;
          });
        return fromPromise(result);
      })
      .filter(v => v)
      .concatMap(message => {
        const result = new Promise(resolve => {
          setTimeout(() => {
            logger.warn('writing_to_db_failed', JSON.stringify(message));
            return resolve(message);
          }, 1000);
        });
        return fromPromise(result);
      })
      .to(`${config.kafkaCommandsTopic}_commands_db_failed`);
    return this._failuresStream.start(
      () => {
        logger.info('Failure Stream Ready ...');
      }, (error) => {
        logger.error('Failure Stream Error', error);
      });
  }

  protected async process(message: { value: any, partition: number, offset: number, topic: string }) {
    const appEvent: IAppEvent = message.value;
    if (!appEvent || !appEvent.data) return;
    const { services, uow } = await this.getServices();
    try {
      const [functionName, serviceName] = appEvent.event.split('_');
      const service = services.get(serviceName);
      if (!service || !service[functionName]) {
        if (appEvent.key) this._commandsProcessor.rejectCommand(appEvent.key, new ServerError('unrecognized command'));
        return;
      }
      const result = await service[functionName](...appEvent.data);
      // tslint:disable-next-line: no-string-literal
      await uow.commit();
      if (appEvent.key) this._commandsProcessor.resolveCommand(appEvent.key, result);
      return;
    } catch (error) {
      return this.handleError(error, appEvent);
    } finally {
      await uow.dispose();
    }
  }

  protected handleError(error: any, appEvent: IAppEvent) {
    if (error instanceof AppError) {
      if (appEvent.key) this._commandsProcessor.rejectCommand(appEvent.key, error);
      logger.error('Processing Error', JSON.stringify(error), error);
      return;
    }
    // Duplicate key error handling
    if (error && error.code === 11000) {
      if (appEvent.key) this._commandsProcessor.rejectCommand(appEvent.key, new InvalidRequestError('item already exists'));
      return;
    }
    logger.error('Processing Error', JSON.stringify(error), error);
    return {
      key: appEvent.key,
      value: JSON.stringify({ ...appEvent, error: JSON.stringify(error) })
    };
  }
}


function mapToProperJSON(message: any) {
  try {
    const newValue = JSON.parse(message.value, reviver);
    const newMessage = { ...message, value: newValue };
    return newMessage;
  } catch (err) {
    return {};
  }
}

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function reviver(key: string, value: any) {
  if (typeof value === 'string' && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}
