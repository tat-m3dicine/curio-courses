import { KafkaStreams } from 'kafka-streams';
import { CommandsStream } from './CommandsStream';
import { getNativeConfig } from './config';
import { CommandsProcessor } from '../CommandsProcessor';
import { IRPStream } from './IRPStream';
import { UpdatesProcessor } from '../UpdatesProcessor';

export class StreamsProcessor {

  private _streams: any[] = [];
  constructor(protected _updatesProcessor: UpdatesProcessor, protected _commandsProcessor: CommandsProcessor) {

  }

  async start() {

    const promises: any[] = [];

    const commandsKafkaStreams = new KafkaStreams(
      <any>getNativeConfig('CoursesCommandsStreams', 'CoursesCommandsStreams')
    );
    const commandsStream = new CommandsStream(commandsKafkaStreams, this._updatesProcessor, this._commandsProcessor);
    const irpStream = new IRPStream(commandsKafkaStreams, this._commandsProcessor);
    promises.push(commandsStream.start(), irpStream.start());
    this._streams.push(commandsStream, irpStream);

    return Promise.all(promises);
  }
}