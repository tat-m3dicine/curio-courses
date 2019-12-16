import { KafkaStreams } from 'kafka-streams';
import { KafkaService } from '../KafkaService';
import { CommandsStream } from './CommandsStream';
import { getNativeConfig } from './config';
import { CommandsProcessor } from '../CommandsProcessor';
import { IRPStream } from './IRPStream';

export class StreamsProcessor {

  private _streams: any[] = [];
  constructor(protected _kafakService: KafkaService, protected _commandsProcessor: CommandsProcessor) {

  }

  async start() {

    const promises: any[] = [];

    const commandsKafkaStreams = new KafkaStreams(
      <any>getNativeConfig('CoursesCommandsStreams', 'CoursesCommandsStreams')
    );
    const commandsStream = new CommandsStream(commandsKafkaStreams, this._kafakService, this._commandsProcessor);
    const irpStream = new IRPStream(commandsKafkaStreams, this._commandsProcessor);
    promises.push(commandsStream.start(), irpStream.start());
    this._streams.push(commandsStream, irpStream);

    return Promise.all(promises);
  }
}