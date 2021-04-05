import { QueryResult, Shape } from "./shape";

export async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  id: string
): Promise<QueryResult<ShapeType>> {
  await shape.fetcher.load(id);
  const [data, errors] = await shape.validateShex(id);
  return {
    id,
    data,
    errors,
  } as QueryResult<ShapeType>;
}