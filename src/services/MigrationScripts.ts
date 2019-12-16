import loggerFactory from '../utils/logging';
import { UsersService } from './UsersService';
import { IRPService } from './IRPService';
import { IUser } from '../models/entities/IUser';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';

const logger = loggerFactory.getLogger('MigrationScripts');
const irpService = new IRPService();

export class MigrationScripts {

    async migrateIRPUsers(commandsProcessor) {
        const client = await getDbClient();
        const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
        const userService = new UsersService(uow, commandsProcessor);
        logger.info('migrateIRPUsers invoked');
        const allSections = await irpService.getAllSections();
        let usersList: IUser[] = [];
        await Promise.all(allSections.map(async section => {
            const results = await irpService.getAllUsersBySection(section.schoolUuid, section.uuid);
            usersList = usersList.concat(results);
        }));
        const response = await userService.doAddMany(usersList);
        logger.info('Count of Users Migrated', response.length);
    }


}