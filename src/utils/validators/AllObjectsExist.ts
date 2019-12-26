import { NotFoundError } from '../../exceptions/NotFoundError';

export const validateAllObjectsExist = (objects: { _id: string }[], objectsIds: string[], schoolId: string, objectType = 'user') => {
  if (objects.length !== objectsIds.length) {
    const notFound: string[] = getNotMatchingObjects(objects, objectsIds);
    throw new NotFoundError(`${objectType}s ['${notFound.join("', '")}'] were not found in '${schoolId}' school!`);
  }
};

export const getNotMatchingObjects = (objects: { _id: string }[], objectsIds: string[]) => {
  return objectsIds.reduce((list, _id) => {
    if (objects.every(object => object._id !== _id)) list.push(_id);
    return list;
  }, <string[]>[]);
};