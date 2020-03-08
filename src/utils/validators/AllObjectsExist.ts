import { NotFoundError } from '../../exceptions/NotFoundError';
import { IEntity } from '@saal-oryx/unit-of-work';

export const validateAllObjectsExist = (objects: IEntity[], objectsIds: string[], schoolId: string, objectType = 'user') => {
  if (objects.length !== objectsIds.length) {
    const notFound: string[] = getNotMatchingObjects(objects, objectsIds);
    const one = notFound.length === 1;
    throw new NotFoundError(`${objectType}${one ? '' : 's'} ['${notFound.join("', '")}'] ${one ? 'was' : 'were'} not found in '${schoolId}' school!`);
  }
};

export const getNotMatchingObjects = (objects: IEntity[], objectsIds: string[]) => {
  return objectsIds.reduce((list, _id) => {
    if (objects.every(object => object._id !== _id)) list.push(_id);
    return list;
  }, <string[]>[]);
};