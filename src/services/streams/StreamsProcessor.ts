import { KafkaStreams } from 'kafka-streams';
import { CommandsStream } from './CommandsStream';
import { getNativeConfig } from './config';
import { CommandsProcessor } from '../CommandsProcessor';
import { IRPStream } from './IRPStream';
import { UpdatesProcessor } from '../UpdatesProcessor';
import { KafkaService } from '../KafkaService';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getDbClient } from '../../utils/getDbClient';
import { getFactory } from '../../repositories/RepositoryFactory';

export class StreamsProcessor {

  private _streams: any[] = [];
  constructor(protected _updatesProcessor: UpdatesProcessor, protected _commandsProcessor: CommandsProcessor, protected _kafkaService: KafkaService) {

  }

  async start() {

    const promises: any[] = [];

    const commandsKafkaStreams = new KafkaStreams(
      <any>getNativeConfig('CoursesCommandsStreams', 'CoursesCommandsStreams')
    );
    const uowFactory = async (options = { useTransactions: true }) => new UnitOfWork(await getDbClient(), getFactory(), options);
    const commandsStream = new CommandsStream(commandsKafkaStreams, this._updatesProcessor, this._commandsProcessor, uowFactory);
    const irpStream = new IRPStream(commandsKafkaStreams, this._kafkaService);
    promises.push(commandsStream.start(), irpStream.start());
    this._streams.push(commandsStream, irpStream);

    return Promise.all(promises);
  }
}