import { KafkaStreams } from 'kafka-streams';
import { IRPStream } from './IRPStream';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { CommandsProcessor, KafkaService, CommandsStream } from '@saal-oryx/event-sourcing';
import config from '../../config';
import { UpdatesProcessor } from '../processors/UpdatesProcessor';
import { getFactory } from '../serviceFactory';
import { Service } from '../../models/ServiceName';
import { UsersService } from '../UsersService';

export class StreamsProcessor {
  private _serviceFactory: (name: string) => any;
  private _getUsersService: () => Promise<UsersService>;

  constructor(
    protected _commandsProcessor: CommandsProcessor,
    protected _kafkaStreams: KafkaStreams,
    unitOfWorkFactory: (options: any) => Promise<UnitOfWork>,
    updatesProcessor: UpdatesProcessor,
    kafkaService: KafkaService
  ) {
    this._serviceFactory = getFactory(unitOfWorkFactory, _commandsProcessor, kafkaService, updatesProcessor);
    this._getUsersService = () => this._serviceFactory(Service.users);
  }

  private _getStreams(): { start: () => any }[] {
    const irpStream = new IRPStream(this._kafkaStreams, this._getUsersService);
    const commandsStream = new CommandsStream(
      this._kafkaStreams,
      this._serviceFactory,
      this._commandsProcessor,
      {
        streamTopic: config.kafkaCommandsTopic,
        failuresStreamTopic: `${config.kafkaCommandsTopic}_db_failed`
      }
    );
    return [commandsStream, irpStream];
  }

  async start() {
    const streams = this._getStreams();
    return Promise.all(streams.map(stream => stream.start()));
  }
}
