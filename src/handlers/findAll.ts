import { QueryResult, Shape } from "../shape";

export interface FindAllArgs<ShapeType> {
  from: string | string[];
  where?: { id?: string | string[] } & Partial<ShapeType>;
}

export async function findAll<ShapeType>(
  shape: Shape<ShapeType>,
  { where, from }: FindAllArgs<ShapeType>
): Promise<QueryResult<ShapeType[]>> {
  const ids = Array.isArray(where?.id) ? where?.id : [where?.id];
  await shape.fetcher.load(from);
  const [data, errors] = await shape.validateShex(ids as string[]);
  return {
    from: ids,
    data,
    errors,
  } as QueryResult<ShapeType[]>;
}
