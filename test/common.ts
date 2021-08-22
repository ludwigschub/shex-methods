import * as pathUtils from 'path';

const config = require('dotenv').config().parsed ?? {};

export const podUrl = (path: string): string => {
  const host = new URL(config.SOLID_IDP ?? process.env.SOLID_IDP).host;
  return (
    'https://' +
    pathUtils.join(
      `${config.SOLID_USERNAME ?? process.env.SOLID_USERNAME}.${host}`,
      path,
    )
  );
};
