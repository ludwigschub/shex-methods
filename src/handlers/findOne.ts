import { QueryResult, Shape } from "../shape";

export interface FindUniqueArgs {
  where: { id: string };
}

export async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  { where }: FindUniqueArgs
): Promise<QueryResult<ShapeType>> {
  const { id } = where;
  await shape.fetcher.load(id);
  const [data, errors] = (await shape.validateShex([id]))[0];
  return {
    id,
    data,
    errors,
  } as QueryResult<ShapeType>;
}
