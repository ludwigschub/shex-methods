import { Statement } from "rdflib";
import { Shape } from "./shape";

export function dataToStatements<ShapeType>(_shape: Shape<ShapeType>, _data: ShapeType) {
  return [[], []] as [Statement[], Statement[]]
}