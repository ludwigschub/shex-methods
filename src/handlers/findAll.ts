import { QueryResult, Shape } from "../shape";
import { validateShex } from "../validate";

export interface FindAllArgs<ShapeType> {
  from: string | string[];
  where?: { id?: string[] } & Partial<Omit<ShapeType, "id">>;
}

export async function findAll<ShapeType>(
  shape: Shape<ShapeType>,
  { where, from }: FindAllArgs<ShapeType>
): Promise<QueryResult<ShapeType[]>> {
  let ids = where?.id;
  const {
    schema,
    context,
    prefixes,
    childContexts,
    type,
    store,
    id: shapeId,
  } = shape;
  await shape.fetcher.load(from);
  const [data, errors] = await validateShex({
    schema,
    prefixes,
    type,
    store,
    shapeId,
    contexts: [context, ...childContexts],
    ids: ids,
  });
  return {
    from,
    data,
    errors,
  } as QueryResult<ShapeType[]>;
}
