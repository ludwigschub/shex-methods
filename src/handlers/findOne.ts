import { AutoInitOptions } from 'rdflib';

import { QueryResult, Shape } from '../shape';
import { validateShapes } from '../validate';

export interface FindUniqueArgs {
  doc: string | string[];
  where: { id?: string };
}

export async function findOne<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { where, doc }: FindUniqueArgs,
  reqOptions?: Partial<AutoInitOptions>
): Promise<QueryResult<ShapeType>> {
  const { id } = where;
  await shape.fetcher.load(doc, {
    headers: new Headers({ Accept: 'text/turtle' }),
    ...(reqOptions ?? {})
  });
  const [data, errors] = await validateShapes<ShapeType, CreateShapeArgs>(
    shape,
    id ? [id] : undefined,
  );
  return {
    doc,
    data: data ? data[0] : undefined,
    errors: errors,
  } as QueryResult<ShapeType>;
}
