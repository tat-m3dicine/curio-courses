import loggerFactory from '../utils/logging';
import { UsersService } from './UsersService';
import { IRPService } from './IRPService';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';
import { IIRPUserMigrationRequest } from '../models/entities/IIRP';

const logger = loggerFactory.getLogger('MigrationScripts');
const irpService = new IRPService();

export class MigrationScripts {
  async migrateIRPUsers(commandsProcessor) {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const userService = new UsersService(uow, commandsProcessor);
    logger.info('migrateIRPUsers invoked');
    const allSections = await irpService.getAllSections();
    let usersList: IIRPUserMigrationRequest[] = [];
    await Promise.all(allSections.map(async section => {
      const results = await irpService.getAllUsersBySection(section.uuid);
      usersList = usersList.concat(results);
    }));
    const response = await userService.migrate(usersList);
    logger.info('Count of Users Migrated', response.length);
  }
}