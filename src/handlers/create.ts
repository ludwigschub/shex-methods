import { IndexedFormula, NamedNode, Statement, UpdateManager } from "rdflib";

import { QueryResult, Shape } from "../shape";
import { getAllStatementsOfNode, validateShex, ValidationResult } from "../validate";

export interface CreateArgs<CreateShapeArgs> {
  doc: string;
  data: CreateShapeArgs & { id: string };
}

export async function create<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, data }: CreateArgs<CreateShapeArgs>
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
    const [_, ins] = await shape.dataToStatements(data, doc);
    const [newShape, errors] = await validateNewShape<
      ShapeType,
      CreateShapeArgs
    >(shape, id, [], ins);
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

export function validateNewShape<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  node: string,
  del: Statement[],
  ins: Statement[]
): Promise<ValidationResult<ShapeType>> {
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
