import { KafkaStreams } from 'kafka-streams';
import { CommandsStream } from './CommandsStream';
import { CommandsProcessor } from '../CommandsProcessor';
import { IRPStream } from './IRPStream';
import { UpdatesProcessor } from '../UpdatesProcessor';
import { KafkaService } from '../KafkaService';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersService } from '../UsersService';

export class StreamsProcessor {

  private _streams: any[] = [];
  constructor(
    protected _updatesProcessor: UpdatesProcessor,
    protected _commandsProcessor: CommandsProcessor,
    protected _kafkaService: KafkaService,
    protected _kafkaStreams: KafkaStreams,
    protected _unitOfWorkFactory: (options: any) => Promise<UnitOfWork>
  ) {

  }

  async start() {
    const promises: any[] = [];
    const getUsersService = (uow: UnitOfWork, kafka: KafkaService) => new UsersService(uow, kafka);
    const commandsStream = new CommandsStream(this._kafkaStreams, this._updatesProcessor, this._commandsProcessor, this._unitOfWorkFactory);
    const irpStream = new IRPStream(this._kafkaStreams, this._kafkaService, this._unitOfWorkFactory, getUsersService);
    promises.push(commandsStream.start(), irpStream.start());
    this._streams.push(commandsStream, irpStream);
    return Promise.all(promises);
  }
}