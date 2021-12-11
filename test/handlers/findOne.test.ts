import { Fetcher } from 'rdflib';

import { solidProfile } from '../resources/shex';
import { podUrl } from '../common';
import setupTests from '../setupTests';

const client = setupTests()
solidProfile.fetcher = new Fetcher(solidProfile.store, {
  fetch: client.fetch.bind(client),
});

describe('.findOne()', () => {
  jest.setTimeout(8000);
  const testIri = podUrl('/profile/card#me');

  it('can find one shape', async () => {
    const shape = await solidProfile.findOne({
      doc: testIri,
      where: { id: testIri },
    });
    const { doc, data } = shape;
    expect(doc).toBe(testIri);
    expect(data.name).toBe('Local Solid User');
    expect(data['foaf:name']).toBe('Local Solid User');
    expect(data.trustedApp['acl:origin']).toBe('https://solid-node-client');
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
