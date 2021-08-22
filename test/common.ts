import molid from 'molid';

export const podUrl = (path: string): string => {
  return molid.uri(path);
};
