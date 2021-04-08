import { NamedNode } from "rdflib";
import { QueryResult, Shape } from "../shape";

export interface CreateArgs<ShapeType> {
  at: string;
  data: ShapeType & { id: string };
}

export async function create<ShapeType>(
  shape: Shape<ShapeType>,
  { at, data }: CreateArgs<ShapeType>
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve, reject) => {
    let doesntExist = "";
    await shape.fetcher.load(at).catch((err) => (doesntExist = err));
    const [ins] = await shape.dataToStatements(data);
    const { id } = data as { id: string };
    if (shape.store.holds(new NamedNode(id), null, null, at)) {
      throw new Error("Shape already exists at " + at);
    }
    if (!doesntExist) {
      shape.updater.update([], ins, async (_uri, ok, error) => {
        !ok
          ? reject(error)
          : resolve(
              await shape.findOne({
                from: at,
                where: { id },
              })
            );
      });
    } else {
      shape.updater.put(
        new NamedNode(at),
        ins,
        "text/turtle",
        async (_uri, ok, error) => {
          !ok
            ? reject(error)
            : resolve(await shape.findOne({ from: at, where: { id } }));
        }
      );
    }
  });
}
