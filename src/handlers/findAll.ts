
import { QueryResult, Shape } from "../shape";

export function findAll<ShapeType>(_shape: Shape<ShapeType>) {
  return [] as QueryResult<ShapeType>[];
}