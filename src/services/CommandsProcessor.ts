import { KafkaService } from './KafkaService';
import config from '../config';
import { Func } from 'continuation-local-storage';
import { createRedisBus } from '@saal-oryx/message-bus';
import nanoid = require('nanoid');
export class CommandsProcessor {


  protected _commandsMap = new Map<string, (err?: Error, result?: any) => void>();
  protected _messageBus = createRedisBus(nanoid(10), {
    host: config.redisHost,
    port: config.redisPort
  });

  constructor(protected _kafkaService: KafkaService) {
    this._messageBus.on<ICommandResult>('resolveCommand', async (event, _) => {
      const callback = this._commandsMap.get(event.data.eventKey);
      if (!callback) return;
      return callback(undefined, event.data.result);
    });
    this._messageBus.on<ICommandResult>('rejectCommand', async (event, _) => {
      const callback = this._commandsMap.get(event.data.eventKey);
      if (!callback) return;
      return callback(event.data.error);
    });
  }

  async resolveCommand<R>(eventKey: string, result: R) {
    this._messageBus.publish(<any>{ name: 'resolveCommand', data: { eventKey, result } });

  }

  async rejectCommand(eventKey: string, error: Error) {
    this._messageBus.publish(<any>{ name: 'rejectCommand', data: { eventKey, error } });
  }

  async sendCommand(serviceName: string, proccessingFunction: Func<Promise<any>>, ...args: any[]): Promise<{ done: boolean, data: any }> {
    const event = await this.sendCommandAsync(serviceName, proccessingFunction);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this._commandsMap.delete(event.key);
        return resolve({ done: false, data: args });
      }, config.comamndsTimeout);
      this._commandsMap.set(event.key, (err, result) => {
        this._commandsMap.delete(event.key);
        if (err) return reject(err);
        return resolve({ done: true, data: result });
      });
    });
  }

  async sendCommandAsync(serviceName: string, proccessingFunction: Func<Promise<any>>, ...args: any[]) {
    const commandKey = this._kafkaService.getNewKey();
    const event = {
      event: `${proccessingFunction.name}_${serviceName}`,
      timestamp: Date.now(),
      data: args,
      v: '1.0.0',
      key: commandKey
    };
    await this._kafkaService.send(config.kafkaCommandsTopic, event);
    return event;
  }
}

interface ICommandResult {
  eventKey: string;
  result?: any;
  error?: any;
}