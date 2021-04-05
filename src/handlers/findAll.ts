
import { QueryResult, Shape } from "../shape";

export interface FindAllArgs<ShapeType> {
  where: { id: string } & ShapeType;
}

export function findAll<ShapeType>(shape: Shape<ShapeType>, args: FindAllArgs<ShapeType>) {
  console.debug(shape, args)
  return [] as QueryResult<ShapeType>[];
}