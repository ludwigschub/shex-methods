import { existsSync, rmSync } from 'fs';

import { SolidNodeClient } from 'solid-node-client';

export default (): SolidNodeClient => {
  const client = new SolidNodeClient();
  if (!existsSync(`${process.cwd()}/testdata`))
    client.createServerlessPod(`${process.cwd()}/testdata`);
  rmSync(`${process.cwd()}/testdata/test`, { recursive: true });
  return client;
};
