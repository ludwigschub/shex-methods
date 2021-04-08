import { NamedNode } from "rdflib";
import { QueryResult, Shape } from "../shape";

export interface CreateArgs<ShapeType> {
  at: string;
  data: ShapeType;
}

export async function create<ShapeType>(
  shape: Shape<ShapeType>,
  { at, data }: CreateArgs<ShapeType>
): Promise<QueryResult<ShapeType>> {
  await shape.fetcher.load(at);
  const [ins] = await shape.dataToStatements(data);
  return new Promise((resolve, reject) => {
    shape.updater.put(
      new NamedNode(at),
      ins,
      "text/turtle",
      async (uri, ok, error) => {
        if (!ok) {
          reject(error);
        } else {
          resolve(await shape.findOne({ from: uri, where: { id: uri } }));
        }
      }
    );
  });
}
