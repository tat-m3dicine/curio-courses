import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor } from './processors/UpdatesProcessor';
import { Service } from '../models/ServiceName';
import { SchoolsService } from './SchoolsService';
import { SectionsService } from './SectionsService';
import { CoursesService } from './CoursesService';
import { InviteCodesService } from './InviteCodesService';
import { ProvidersService } from './ProviderService';
import { UsersService } from './UsersService';

export const getFactory = (
  unitOfWorkFactory: (options: any) => Promise<UnitOfWork>,
  commandsProcessor: CommandsProcessor,
  kafkaService: KafkaService,
  updatesProcessor: UpdatesProcessor
) => {
  return async (serviceName: string) => {
    const uow = await unitOfWorkFactory({ useTransactions: false });
    const service: any = (() => {
      switch (serviceName) {
        case Service.schools: return new SchoolsService(uow, commandsProcessor, kafkaService);
        case Service.sections: return new SectionsService(uow, commandsProcessor, updatesProcessor);
        case Service.courses: return new CoursesService(uow, commandsProcessor, updatesProcessor);
        case Service.inviteCodes: return new InviteCodesService(uow, commandsProcessor);
        case Service.providers: return new ProvidersService(uow, commandsProcessor);
        case Service.users: return new UsersService(uow, kafkaService);
        default: throw new Error('unknown service');
      }
    })();
    service.dispose = async () => uow.dispose();
    return service;
  };
};