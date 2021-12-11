import { rmSync, existsSync } from 'fs';

import { SolidNodeClient } from 'solid-node-client';

export default (): SolidNodeClient => {
  const client = new SolidNodeClient();
  if (existsSync(`${process.cwd()}/testdata`)) {
    rmSync(`${process.cwd()}/testdata`, { recursive: true });
  }
  return client;
};
