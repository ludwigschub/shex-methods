import { solidProfile } from '../resources/shex';
import { SolidNodeClient } from 'solid-node-client';
import { podUrl } from '../common';
const config = require('dotenv').config();

describe('.findOne()', () => {
  jest.setTimeout(8000);
  const testIri = podUrl('/profile/card#me');
  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    solidProfile.fetcher._fetch = client.fetch.bind(client);
    await solidProfile.update({
      doc: testIri,
      data: {
        id: testIri,
        name: 'Tester',
        hasEmail: { value: new URL('mailto:lalasepp@lalatest.com') },
      },
    });
  });

  it('can find one shape', async () => {
    const shape = await solidProfile.findOne({
      doc: testIri,
      where: { id: testIri },
    });
    const { doc, data } = shape;
    expect(doc).toBe(testIri);
    expect(data.name).toBe('Tester');
    expect(data['foaf:name']).toBe('Tester');
    expect(data.hasEmail['vcard:value']).toBe('mailto:lalasepp@lalatest.com');
  });

  it('should return an error for finding the wrong shape', async () => {
    const testIri = podUrl('/profile');
    const { errors } = await solidProfile.findOne({
      doc: testIri,
      where: { id: testIri },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `validating ${podUrl(
        '/profile',
      )} as https://shaperepo.com/schemas/solidProfile#SolidProfileShape:`,
      '    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      '  OR',
      '  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    ]);
  });
});
