import { NamedNode, Statement, UpdateManager } from "rdflib";
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
    const [_del, ins] = await shape.dataToStatements(data);
    const { id } = data as { id: string };
    if (shape.store.holds(new NamedNode(id), null, null, at)) {
      throw new Error("Shape already exists at " + at);
    }
    if (!doesntExist) {
      await updateExisting(shape.updater, [], ins).catch((err) => reject(err));
    } else {
      await createNew(shape.updater, at, ins).catch((err) => reject(err));
    }
    resolve(
      await shape.findOne({
        from: at,
        where: { id },
      })
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

function createNew(
  updater: UpdateManager,
  at: string,
  ins: Statement[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    updater.put(
      new NamedNode(at),
      ins,
      "text/turtle",
      async (_uri, ok, error) => {
        !ok ? reject(error) : resolve();
      }
    );
  });
}
