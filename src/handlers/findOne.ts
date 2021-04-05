import { QueryResult, Shape } from "../shape";

export interface FindUniqueArgs {
  from: string | string[];
  where: { id: string };
}

export async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  { where, from }: FindUniqueArgs
): Promise<QueryResult<ShapeType>> {
  const { id } = where;
  await shape.fetcher.load(from);
  const [data, errors] = await shape.validateShex([id]);
  return {
    from: id,
    data: data ? data[0] : undefined,
    errors: errors,
  } as QueryResult<ShapeType>;
}
