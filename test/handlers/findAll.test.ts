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
} from '../resources/shex';

describe('.findAll()', () => {
  it('can find all instances of shape', async () => {
    const testDoc = podUrl('/profile/');
    const testIri = podUrl('/profile/card');
    const shape = await resource.findAll({
      doc: testDoc,
    });
    const { doc, data, errors } = shape;
    const card = data[2] as ResourceShape;
    expect(errors).toBeUndefined();
    expect(doc).toBe(testDoc);
    expect(card.id).toBe(testIri);
    expect(card.type).toBe('http://www.w3.org/ns/ldp#Resource');
  });

  it('can find all instances of shape in multiple files', async () => {
    const testDoc1 = podUrl('/profile/');
    const testDoc2 = podUrl('/public/');
    const testIri = podUrl('/profile/');
    const shape = await basicContainer.findAll({
      doc: [testDoc1, testDoc2],
    });
    const { doc, data, errors } = shape;
    const profileFolder = data?.find((folder) => folder.id === testIri);
    const card = profileFolder?.contains[0];
    expect(errors).toBeUndefined();
    expect(data.length).toBe(2);
    expect(doc).toStrictEqual([testDoc1, testDoc2]);
    expect(profileFolder.id).toBe(testIri);
    expect(card.type).toBe('http://www.w3.org/ns/ldp#Resource');
  });

  it('should return an error for finding the wrong shape', async () => {
    const testDoc = podUrl('/profile/');
    const resource = new Shape<ResourceShape, ResourceShapeCreateArgs>({
      id: 'http://www.w3.org/ns/ldp#ResourceShape',
      shape: ldpShapesShex,
      context: ResourceShapeContext,
      type: ResourceShapeType,
    });
    const { errors } = await resource.findAll({
      doc: testDoc,
      where: { id: [testDoc] },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `validating ${podUrl(
        '/profile/',
      )} as http://www.w3.org/ns/ldp#ResourceShape:`,
      '    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    ]);
  });
});
