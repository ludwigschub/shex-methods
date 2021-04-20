import { QueryResult, Shape } from "../shape";
import { validateShapes } from "../validate";

export interface FindUniqueArgs {
  from: string | string[];
  where: { id: string };
}

export async function findOne<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { where, from }: FindUniqueArgs
): Promise<QueryResult<ShapeType>> {
  const { id } = where;
  await shape.fetcher.load(from);
  const [data, errors] = await validateShapes<ShapeType, CreateShapeArgs>(shape, [id]);
  return {
    from,
    data: data ? data[0] : undefined,
    errors: errors,
  } as QueryResult<ShapeType>;
}
