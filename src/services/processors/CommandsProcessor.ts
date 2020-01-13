import { Func } from 'continuation-local-storage';
import { RedisMesageBus } from '@saal-oryx/message-bus';
import config from '../../config';
import { KafkaService } from './KafkaService';

const commandsProcessorDefaultConfig = {
  commandsTimeout: config.commandsTimeout
};

export class CommandsProcessor {

  protected _commandsMap = new Map<string, (err?: Error, result?: any) => void>();

  constructor(protected _kafkaService: KafkaService, protected _messageBus: RedisMesageBus, protected _config = commandsProcessorDefaultConfig) {
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

  get kafkaService() {
    return this._kafkaService;
  }

  async resolveCommand<R>(eventKey: string, result: R) {
    this._messageBus.publish(<any>{ name: 'resolveCommand', data: { eventKey, result } });
  }

  async rejectCommand(eventKey: string, error: Error) {
    this._messageBus.publish(<any>{ name: 'rejectCommand', data: { eventKey, error } });
  }

  async sendCommand(serviceName: string, proccessingFunction: Func<Promise<any>>, ...args: any[]): Promise<{ done: boolean, data: any }> {
    const event = await this.sendCommandAsync(serviceName, proccessingFunction, ...args);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._commandsMap.delete(event.key);
        return resolve({ done: false, data: args });
      }, this._config.commandsTimeout);
      timer.unref();
      this._commandsMap.set(event.key, (err, result) => {
        clearTimeout(timer);
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

  async sendManyCommandsAsync(serviceName: string, proccessingFunction: Func<Promise<any>>, args: any[][]) {
    const commandKey = this._kafkaService.getNewKey();
    const now = Date.now();
    const events = args.map(arg => ({
      event: `${proccessingFunction.name}_${serviceName}`,
      timestamp: now,
      data: arg,
      v: '1.0.0',
      key: commandKey
    }));
    await this._kafkaService.sendMany(config.kafkaCommandsTopic, events);
    return events;
  }
}

interface ICommandResult {
  eventKey: string;
  result?: any;
  error?: any;
}