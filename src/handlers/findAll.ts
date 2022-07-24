import { AutoInitOptions } from '@collaboware/rdflib';

import { QueryResult, Shape } from '../shape';
import { validateShapes } from '../validate';

export interface FindAllArgs<ShapeType> {
  doc: string | string[];
  where?: { id?: string[] } & Partial<Omit<ShapeType, 'id'>>;
}

export async function findAll<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { where, doc }: FindAllArgs<ShapeType>,
  reqOptions?: Partial<AutoInitOptions>
): Promise<QueryResult<ShapeType[]>> {
  const ids = where?.id;
  await shape.fetcher.load(doc, {
    headers: new Headers({ accept: 'text/turtle' }),
    ...(reqOptions ?? {})
  });
  const [data, errors] = await validateShapes<ShapeType, CreateShapeArgs>(
    shape,
    ids,
    doc,
  );
  return {
    doc,
    data,
    errors,
  } as QueryResult<ShapeType[]>;
}
