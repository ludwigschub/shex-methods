import * as pathUtils from 'path';

const pod = `${process.cwd()}/testdata`;
export const podUrl = (path: string): string => {
  return 'file://' + pathUtils.join(pod, path);
};
