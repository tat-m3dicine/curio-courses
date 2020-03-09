import { CommandsProcessor, KafkaService, IKafkaEvent } from '@saal-oryx/event-sourcing';
import { IMessageBus } from '@saal-oryx/event-sourcing/dist/interfaces/IMessageBus';

import { AppError } from '../../exceptions/AppError';

import loggerFactory from '../../utils/logging';
const logger = loggerFactory.getLogger('FakeCommandsProcessor');


export class FakeCommandsProcessor extends CommandsProcessor {

  protected _serviceFactory!: (serviceName: string) => Promise<any>;

  constructor(_kafkaService: KafkaService, _messageBus: IMessageBus, _config: {
    kafkaCommandsTopic: string;
    commandsTimeout: number;
  }) {
    super(_kafkaService, _messageBus, _config);
  }

  setServiceFactory(serviceFactory: (serviceName: string) => Promise<any>) {
    this._serviceFactory = serviceFactory;
  }

  public async sendCommand(serviceName: string, proccessingFunction: (...args: any[]) => Promise<any>, ...args: any[]): Promise<{
    done: boolean;
    data: any;
  }> {
    const event = await super.sendCommandAsync(serviceName, proccessingFunction, ...args);
    return this.handleEvent(event);
  }



  protected async resolveFunction(eventName: string) {
    const [methodName, serviceName] = eventName.split('_');
    const service = await this._serviceFactory(serviceName);
    if (!service || !service[methodName]) {
      throw new AppError('unrecognized command', 'service was not found!');
    }
    return {
      method: service[methodName] as (...args: any[]) => Promise<any>,
      service,
    };
  }

  public async handleEvent<T extends any[]>(appEvent: IKafkaEvent<T>) {
    logger.debug('handleEvent', appEvent);
    let service: { dispose: () => void; } | undefined;
    try {
      const resolver = await this.resolveFunction(appEvent.event);
      service = resolver.service;
      const result = await resolver.method.call(service, ...appEvent.data);
      return { done: true, data: result };
    } finally {
      if (service) service.dispose();
    }
  }
}