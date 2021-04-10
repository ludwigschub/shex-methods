import { NamedNode, Statement, UpdateManager } from "rdflib";
import { QueryResult, Shape } from "../shape";

export interface UpdateArgs<ShapeType> {
  doc: string;
  data: ShapeType & { id: string };
}

export async function update<ShapeType>(
  shape: Shape<ShapeType>,
  { doc, data }: UpdateArgs<ShapeType>
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve, reject) => {
    const { id } = data as { id: string };
    await shape
      .findOne({
        from: doc,
        where: { id },
      })
      .catch(reject);
    if (shape.store.holds(new NamedNode(id), null, null, doc)) {
      throw new Error("Shape already exists at " + doc);
    }
    const [del, ins] = await shape.dataToStatements(data, doc);
    await updateExisting(shape.updater, del, ins).catch((err) => reject(err));
    resolve(
      (await shape.findOne({
        from: doc,
        where: { id },
      })) as QueryResult<ShapeType>
    );
  });
}

function updateExisting(
  updater: UpdateManager,
  del: Statement[],
  ins: Statement[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    updater.update(del, ins, async (_uri, ok, error) => {
      !ok ? reject(error) : resolve();
    });
  });
}
