import * as pathUtils from 'path';

export const podUrl = (path: string): string => {
  return pathUtils.join(`http://localhost:3333`, path);
};
