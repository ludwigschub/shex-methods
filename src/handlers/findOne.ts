import { QueryResult, Shape } from "../shape";
import { validateShex } from "../validate";

export interface FindUniqueArgs {
  from: string | string[];
  where: { id: string };
}

export async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  { where, from }: FindUniqueArgs
): Promise<QueryResult<ShapeType>> {
  const {
    schema,
    context,
    prefixes,
    childContexts,
    type,
    store,
    fetcher,
    id: shapeId,
  } = shape;
  const { id } = where;
  await fetcher.load(from);
  const [data, errors] = await validateShex({
    schema,
    prefixes,
    type,
    store,
    shapeId,
    contexts: [context, ...childContexts],
    ids: [id],
  });
  return {
    from,
    data: data ? data[0] : undefined,
    errors: errors,
  } as QueryResult<ShapeType>;
}
