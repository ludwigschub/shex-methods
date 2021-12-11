import { readFileSync, writeFileSync, existsSync } from 'fs';

import { SolidNodeClient } from 'solid-node-client';

export default (): SolidNodeClient => {
  const client = new SolidNodeClient();
  if (!existsSync(`${process.cwd()}/testdata`)) {
    client.createServerlessPod(`${process.cwd()}/testdata`);
  } else {
    const profile = readFileSync(
      `${process.cwd()}/testdata/profile/card`,
    ).toString();
    if (profile.includes('<http://example.org>')) {
      writeFileSync(
        `${process.cwd()}/testdata/profile/card`,
        profile.replace('<http://example.org>', '<https://solid-node-client>'),
        { encoding: 'utf-8' },
      );
    }
  }
  return client;
};
