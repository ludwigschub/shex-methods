import { rmSync, existsSync } from 'fs';

import { SolidNodeClient } from 'solid-node-client/dist/esm';

export const setup = (): SolidNodeClient => {
  const client = new SolidNodeClient();
  if (existsSync(`${process.cwd()}/testdata`)) {
    rmSync(`${process.cwd()}/testdata`, { recursive: true });
  }
  return client;
};

export default setup