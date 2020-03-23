import config from '../../config';
import { KafkaStreams } from 'kafka-streams';
import { UsersService } from '../UsersService';
import loggerFactory from '../../utils/logging';
import { BaseStream, IKafkaEvent, IKafkaMessage } from '@saal-oryx/event-sourcing';

const logger = loggerFactory.getLogger('IRPStream');

export class IRPStream extends BaseStream<IKafkaEvent<any>> {

  constructor(
    protected _kafkaStreams: KafkaStreams,
    protected _getUsersService: () => Promise<UsersService>,
    writeToFailedDelayInMs?: number
  ) {
    super(_kafkaStreams, {
      streamTopic: config.kafkaIRPTopic,
      failuresStreamTopic: `${config.kafkaIRPTopic}_db_failed`,
      writeToFailedDelayInMs: writeToFailedDelayInMs || 1000
    });
  }

  protected async processMessage(message: IKafkaMessage<IKafkaEvent<any>>) {
    try {
      const appEvent: IKafkaEvent<any> = message.value;
      if (!appEvent || !appEvent.data) return;
      const usersService = await this._getUsersService();

      switch (appEvent.event) {
        case 'user_created':
        case 'user_updated':
          await usersService.signupOrUpdate(appEvent.data);
          break;
      }
      return;
    } catch (err) {
      // Duplicate key error handling
      if (err && err.code === 11000) {
        this.logger.warn('Processing Warn', JSON.stringify(err), err);
        return;
      }
      logger.error('Processing Error', JSON.stringify(err), err);
      return {
        key: message.value.key,
        value: JSON.stringify({ ...message.value, error: JSON.stringify(err) })
      };
    }
  }
}
