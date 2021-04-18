import { IndexedFormula, NamedNode, Statement, UpdateManager } from "rdflib";
import { QueryResult, Shape } from "../shape";
import { getAllStatementsOfNode, validateShex } from "../validate";

export interface CreateArgs<ShapeType> {
  doc: string;
  data: ShapeType & { id: string };
}

export async function create<ShapeType>(
  shape: Shape<ShapeType>,
  { doc, data }: CreateArgs<ShapeType>
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve) => {
    let doesntExist = "";
    await shape.fetcher
      .load(doc, { clearPreviousData: true })
      .catch((err) => err.status === 404 && (doesntExist = err));
    const { id } = data as { id: string };
    if (shape.store.any(new NamedNode(id), null, null, new NamedNode(doc))) {
      resolve({
        from: doc,
        errors: ["Node with id: " + id + " already exists in doc:" + doc],
      });
    }
    const [_del, ins] = await shape.dataToStatements(data, doc);
    const [newShape, errors] = await validateNewShape<ShapeType>(
      shape,
      id,
      [],
      ins
    );
    if (!newShape || errors) {
      resolve({ from: doc, errors });
    } else {
      if (!doesntExist) {
        await updateExisting(shape.updater, [], ins)
          .catch((err) => resolve({ from: doc, errors: [err] }))
          .then(() => resolve({ from: doc, data: newShape[0], errors }));
      } else {
        await createNew(shape.updater, doc, ins)
          .catch((err) => resolve({ from: doc, errors: [err] }))
          .then(() => resolve({ from: doc, data: newShape[0], errors }));
      }
    }
  });
}

export function validateNewShape<ShapeType>(
  shape: Shape<ShapeType>,
  node: string,
  del: Statement[],
  ins: Statement[]
) {
  const updatedStore = new IndexedFormula();
  updatedStore.add(getAllStatementsOfNode(shape.store, new NamedNode(node)));
  updatedStore.remove(del);
  updatedStore.add(ins);
  const { schema, context, prefixes, childContexts, type, id: shapeId } = shape;
  return validateShex<ShapeType>({
    schema,
    type,
    shapeId,
    prefixes,
    store: updatedStore,
    contexts: [context, ...childContexts],
  });
}

export function updateExisting(
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
  doc: string,
  ins: Statement[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    updater.put(
      new NamedNode(doc),
      ins,
      "text/turtle",
      async (_uri, ok, error) => {
        !ok ? reject(error) : resolve();
      }
    );
  });
}
