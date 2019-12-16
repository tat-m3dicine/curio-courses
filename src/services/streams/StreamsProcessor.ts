import { KafkaStreams } from 'kafka-streams';
import { KafkaService } from '../KafkaService';
import { CommandsStream } from './CommandsStream';
import { getNativeConfig } from './config';
import { CommandsProcessor } from '../CommandsProcessor';

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
    promises.push(commandsStream.start());
    this._streams.push(commandsStream);

    return Promise.all(promises);
  }
}