import loggerFactory from '../utils/logging';
import { UsersService } from './UsersService';
import { IRPService } from './IRPService';
import { IUser } from '../models/entities/IUser';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';
import { SchoolsService } from './SchoolsService';
import { ISchool } from '../models/entities/ISchool';
import { CoursesService } from '../services/CoursesService';
import { KafkaService } from './KafkaService';

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
            try{
            const results = await irpService.getAllUsersBySection(section.schoolUuid, section.uuid);
            usersList = usersList.concat(results);
        }
        catch (err) {
            logger.info(`migrateIRPUsers failed with err: ${err}`);
        } 
        }));
        const response = await userService.doAddMany(usersList);
        logger.info('Count of Users Migrated', response.length);
        return response;
    }

    async migrateIRPSchools(commandsProcessor, kafkaService) {
        const client = await getDbClient();
        const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
        const schoolsService = new SchoolsService(uow, commandsProcessor);
        const listOfUsers = await  new CoursesService(uow, commandsProcessor, kafkaService).getAllUsers();
        const allSchools = await irpService.getAllSchools();
        let schoolList: ISchool[] = [];
        await Promise.all(allSchools.map(async school => {
           const results = await irpService.mapIRPSchoolsToDbSchools(school, listOfUsers);
            schoolList = schoolList.concat(results);
      }));
         const response = await schoolsService.doAddMany(schoolList);
         logger.info('Count of schools Migrated', response.length);
    }

}