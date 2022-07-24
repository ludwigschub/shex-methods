import { Fetcher } from '@collaboware/rdflib';

import { Shape } from '../../lib';
import { podUrl } from '../common';
import {
  ResourceShape,
  ldpShapesShex,
  ResourceShapeContext,
  ResourceShapeType,
  resource,
  basicContainer,
  ResourceShapeCreateArgs,
  BasicContainerShapeType,
} from '../resources/shex';
import setupTests from '../setupTests';

const client = setupTests();
resource.fetcher = new Fetcher(resource.store, {
  fetch: client.fetch.bind(client),
});
basicContainer.fetcher = new Fetcher(basicContainer.store, {
  fetch: client.fetch.bind(client),
});
const testDoc = podUrl('/test.ttl');
const secondTestDoc = podUrl('/test2.ttl');
const cardIri = podUrl('/test/card.ttl');
const secondIri = podUrl('/test/test.txt');
const containerIri = podUrl('/test.ttl');
const secondContainerIri = podUrl('/test2.ttl');

describe('.findAll()', () => {
  beforeAll(async () => {
    const card = await resource.create({
      doc: testDoc,
      data: {
        id: cardIri,
        type: ResourceShapeType.Resource,
        size: 64,
        mtime: new Date().getTime(),
        modified: new Date(),
      },
    });
    expect(card.errors).toBeUndefined();
    expect(card.data).toBeDefined();
    const container = await basicContainer.create({
      doc: testDoc,
      data: {
        id: containerIri,
        type: [
          BasicContainerShapeType.BasicContainer,
          BasicContainerShapeType.Container,
        ],
        size: 64,
        mtime: new Date().getTime(),
        modified: new Date(),
        contains: [
          new URL(cardIri),
          {
            id: secondIri,
            type: ResourceShapeType.Resource,
            size: 64,
            mtime: new Date().getTime(),
            modified: new Date(),
          },
        ],
      },
    });
    expect(container.errors).toBeUndefined();
    expect(container.data).toBeDefined();
    const secondContainer = await basicContainer.create({
      doc: secondTestDoc,
      data: {
        id: secondContainerIri,
        type: [
          BasicContainerShapeType.BasicContainer,
          BasicContainerShapeType.Container,
        ],
        size: 64,
        mtime: new Date().getTime(),
        modified: new Date(),
      },
    });
    expect(secondContainer.errors).toBeUndefined();
    expect(secondContainer.data).toBeDefined();
  });
  it('can find all instances of shape', async () => {
    const shape = await resource.findAll({
      doc: testDoc,
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();

    const card = data.find(
      (resource) => resource.id === cardIri,
    ) as ResourceShape;
    expect(doc).toBe(testDoc);
    expect(card.id).toBe(cardIri);
    expect(card.type).toBe('http://www.w3.org/ns/ldp#Resource');
  });

  it('can find all instances of shape in multiple files', async () => {
    const shape = await basicContainer.findAll({
      doc: [testDoc, secondTestDoc],
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();

    const profileFolder = data?.find((folder) => folder.id === containerIri);
    const card = profileFolder?.contains[0];
    expect(doc).toStrictEqual([testDoc, secondTestDoc]);
    expect(card.type).toBe('http://www.w3.org/ns/ldp#Resource');
  });

  it('should return an error for finding the wrong shape', async () => {
    const { data, errors } = await basicContainer.findAll({
      doc: testDoc,
      where: { id: [cardIri] },
    });
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `validating ${podUrl(
        '/test/card.ttl',
      )} as http://www.w3.org/ns/ldp#BasicContainerShape:`,
      '    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      '  OR',
      '  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    ]);
  });
});
