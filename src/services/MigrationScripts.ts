import loggerFactory from '../utils/logging';
import { IRPService } from './IRPService';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';
import { IIRPUserMigrationRequest } from '../models/entities/IIRP';
import validators from '../utils/validators';
import { IUser } from '../models/entities/IUser';

const logger = loggerFactory.getLogger('MigrationScripts');

export class MigrationScripts {
  async migrateIRPUsers() {
    logger.info('migrateIRPUsers invoked');

    const irpService = new IRPService();
    const allSections = await irpService.getAllSections();
    let usersList: IIRPUserMigrationRequest[] = [];
    await Promise.all(allSections.map(async section => {
      const results = await irpService.getAllUsersBySection(section.uuid);
      usersList = usersList.concat(results);
    }));
    const response = await this.migrate(usersList);
    logger.info('Count of Users Migrated', response.length);
  }

  async migrate(requests: IIRPUserMigrationRequest[]) {
    const now = new Date();

    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });

    requests = requests.filter(request => {
      return validators.validateMigrateUser(request);
    });
    const users: IUser[] = requests.map(user => ({
      _id: user._id,
      role: [user.role.toLowerCase()],
      profile: {
        name: user.name,
        avatar: user.avatar
      },
      school: {
        _id: user.schooluuid,
        joinDate: now
      }
    }));
    if (!users || users.length === 0) {
      logger.debug('No users found to migrate!');
      return [];
    }
    return uow.getRepository('Users').addMany(users, false);
  }
}