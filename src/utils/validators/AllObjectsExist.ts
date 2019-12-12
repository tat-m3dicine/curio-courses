import { NotFoundError } from '../../exceptions/NotFoundError';

export const validateAllObjectsExist = (objects: { _id: string }[], objectsIds: string[], schoolId: string, objectType = 'user') => {
  if (objects.length !== objectsIds.length) {
    const notFound: string[] = objectsIds.reduce((list, _id) => {
      if (objects.every(object => object._id !== _id)) list.push(_id);
      return list;
    }, <string[]>[]);
    throw new NotFoundError(`${objectType}s ['${notFound.join("', '")}'] were not found in '${schoolId}' school!`);
  }
};
