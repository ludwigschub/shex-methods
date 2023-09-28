import { Fetcher } from 'rdflib';

import { ModeType, solidProfile, SolidProfileShapeType } from '../resources/shex';
import { podUrl } from '../common';
import setupTests from '../setupTests';

const client = setupTests()
solidProfile.fetcher = new Fetcher(solidProfile.store, {
  fetch: client.fetch.bind(client),
});

describe('.findOne()', () => {
  jest.setTimeout(8000);
  const profileDoc = podUrl('/test/findOneProfile.ttl');
  const profileIri = podUrl('/test/findOneProfile.ttl');

  beforeAll(async () => {
    const profileShape = await solidProfile.create({
      doc: profileDoc,
      data: {
        id: profileIri,
        type: [
          SolidProfileShapeType.FoafPerson,
          SolidProfileShapeType.SchemPerson,
        ],
        name: 'Local Solid User',
        trustedApp: [
          {
            mode: [
              ModeType.Append,
              ModeType.Control,
              ModeType.Read,
              ModeType.Write,
            ],
            origin: new URL('http://example.org'),
          },
        ],
      },
    });
    expect(profileShape.errors).toBeUndefined();
    expect(profileShape.data).toBeDefined();
  });

  it('can find one shape', async () => {
    const shape = await solidProfile.findOne({
      doc: profileIri,
      where: { id: profileIri },
    });
    const { doc, data } = shape;
    expect(doc).toBe(profileIri);
    expect(data.name).toBe('Local Solid User');
    expect(data['foaf:name']).toBe('Local Solid User');
    expect(data.trustedApp['acl:origin']).toBe('http://example.org/');
  });
  
  it('can display document of one shape', async () => {
    const shape = await solidProfile.findOne({
      doc: profileIri,
      where: { id: profileIri },
    });
    const { data } = shape;
    expect(data.__doc).toBe(profileIri);
  });

  it('should return an error for finding the wrong shape', async () => {
    const profileIri = podUrl('/test');
    const { errors } = await solidProfile.findOne({
      doc: profileIri,
      where: { id: profileIri },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `validating ${podUrl(
        '/test',
      )} as https://shaperepo.com/schemas/solidProfile#SolidProfileShape:`,
      '    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      '  OR',
      '  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    ]);
  });
});
