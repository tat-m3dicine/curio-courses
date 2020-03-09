import { KafkaStreams } from 'kafka-streams';
import { IRPStream } from './IRPStream';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { CommandsProcessor, KafkaService, CommandsStream } from '@saal-oryx/event-sourcing';
import config from '../../config';
import { UpdatesProcessor } from '../processors/UpdatesProcessor';
import { getFactory } from '../ServiceFactory';
import { Service } from '../../models/ServiceName';
import { UsersService } from '../UsersService';
import { getNativeConfig } from '../../config/native';

export class StreamsProcessor {
  private _serviceFactory: (name: string) => any;
  private _getUsersService: () => Promise<UsersService>;

  constructor(
    protected _commandsProcessor: CommandsProcessor,
    unitOfWorkFactory: (options: any) => Promise<UnitOfWork>,
    updatesProcessor: UpdatesProcessor,
    kafkaService: KafkaService
  ) {
    this._serviceFactory = getFactory(unitOfWorkFactory, _commandsProcessor, kafkaService, updatesProcessor);
    this._getUsersService = () => this._serviceFactory(Service.users);
  }

  private _getStreams(): { start: () => any }[] {
    const kafkaStreams = new KafkaStreams(
      <any>getNativeConfig('CoursesCommandsStreams', 'CoursesCommandsStreams')
    );
    const irpStream = new IRPStream(kafkaStreams, this._getUsersService);
    // .. const commandsStream = new CommandsStream(
    //   kafkaStreams,
    //   this._serviceFactory,
    //   this._commandsProcessor,
    //   {
    //     streamTopic: config.kafkaCommandsTopic,
    //     failuresStreamTopic: `${config.kafkaCommandsTopic}_db_failed`
    //   }
    // );
    return [irpStream];
  }

  async start() {
    const streams = this._getStreams();
    return Promise.all(streams.map(stream => stream.start()));
  }
}
