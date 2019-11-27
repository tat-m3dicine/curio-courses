import { KafkaService } from './KafkaService';
import config from '../config';
import { Func } from 'continuation-local-storage';

export class CommandsProcessor {


  protected _commandsMap = new Map<string, (err?: Error, result?: any) => void>();

  constructor(protected _kafkaService: KafkaService) {

  }

  async resolveCommand<R>(eventKey: string, result: R) {
    const callback = this._commandsMap.get(eventKey);
    if (!callback) return;
    return callback(undefined, result);
  }

  async rejectCommand(eventKey: string, error: Error) {
    const callback = this._commandsMap.get(eventKey);
    if (!callback) return;
    return callback(error);
  }

  async sendCommand(serviceName: string, proccessingFunction: Func<Promise<any>>, ...args: any[]): Promise<{ done: boolean, data: any }> {
    const commandKey = this._kafkaService.getNewKey();
    const event = {
      event: `${proccessingFunction.name}_${serviceName}`,
      timestamp: Date.now(),
      data: args,
      v: '1.0.0',
      key: commandKey
    };
    await this._kafkaService.send(config.kafkaCommandsTopic, 0, event);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this._commandsMap.delete(commandKey);
        return resolve({ done: false, data: args });
      }, config.comamndsTimeout);
      this._commandsMap.set(commandKey, (err, result) => {
        this._commandsMap.delete(commandKey);
        if (err) return reject(err);
        return resolve({ done: true, data: result });
      });
    });
  }
}