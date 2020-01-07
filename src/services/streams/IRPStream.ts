import config from '../../config';
import { fromPromise } from 'most';
import { KafkaStreams, KStream } from 'kafka-streams';
import { UsersService } from '../UsersService';
import loggerFactory from '../../utils/logging';
import { getDbClient } from '../../utils/getDbClient';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../../repositories/RepositoryFactory';
import { IAppEvent } from '../../models/events/IAppEvent';
import { KafkaService } from '../KafkaService';

const logger = loggerFactory.getLogger('IRPStream');

export class IRPStream {

  protected _stream: KStream;
  protected _failuresStream: KStream;

  protected _usersService?: UsersService;

  constructor(protected _kafkaStreams: KafkaStreams, protected _kafkaService: KafkaService) {
    logger.debug('Init ...');
    this._stream = _kafkaStreams.getKStream(config.kafkaIRPTopic);
    this._failuresStream = _kafkaStreams.getKStream(`${config.kafkaIRPTopic}_irp_db_failed`);
  }

  async start() {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    this._usersService = new UsersService(uow, this._kafkaService);
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
          await client.commitLocalOffsetsForTopic(config.kafkaIRPTopic);
          return result;
        });
        return fromPromise(result);
      })
      .filter(v => v)
      .to(`${config.kafkaIRPTopic}_irp_db_failed`);
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
            await client.commitLocalOffsetsForTopic(`${config.kafkaIRPTopic}_irp_db_failed`);
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
      .to(`${config.kafkaIRPTopic}_irp_db_failed`);
    return this._failuresStream.start(
      () => {
        logger.info('Failure Stream Ready ...');
      }, (error) => {
        logger.error('Failure Stream Error', error);
      });
  }

  protected async process(message: { value: any, partition: number, offset: number, topic: string }) {
    try {
      const appEvent: IAppEvent = message.value;
      if (!appEvent || !appEvent.data) return;
      if (!this._usersService) return;

      switch (appEvent.event) {
        case 'user_created':
          await this._usersService.signup(appEvent.data);
          break;
        case 'user_updated':
          await this._usersService.update(appEvent.data);
          break;
      }
      return;
    } catch (err) {
      logger.error('Processing Error', JSON.stringify(err), err);
      return {
        key: message.value.key,
        value: JSON.stringify({ ...message.value, error: JSON.stringify(err) })
      };
    }
  }
}


function mapToProperJSON(message: any) {
  const newValue = JSON.parse(message.value, reviver);
  const newMessage = { ...message, value: newValue };
  return newMessage;
}

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function reviver(key: string, value: any) {
  if (typeof value === 'string' && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}
