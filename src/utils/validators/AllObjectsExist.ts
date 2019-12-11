import { NotFoundError } from '../../exceptions/NotFoundError';

export const validateAllObjectsExist = (objects: { _id: string }[], objectsIds: string[], schoolId: string, objectType = 'user') => {
  if (objects.length !== objectsIds.length) {
    const notFound: string[] = objectsIds.reduce((list, id) => {
      if (objects.every(object => object._id !== id)) list.push(id);
      return list;
    }, <string[]>[]);
    throw new NotFoundError(`${objectType}s ['${notFound.join("', '")}'] were not found in '${schoolId}' school!`);
  }
};
