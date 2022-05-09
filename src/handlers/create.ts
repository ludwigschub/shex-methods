import { IndexedFormula, NamedNode, Statement, UpdateManager } from 'rdflib';

import { QueryResult, Shape } from '../shape';
import {
  getAllStatementsOfNode,
  validateShex,
  ValidationResult,
} from '../validate';

export interface CreateArgs<CreateShapeArgs> {
  doc: string;
  data: CreateShapeArgs & { id: string };
}

export async function create<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, data }: CreateArgs<CreateShapeArgs>,
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve) => {
    let doesntExist = false;
    await shape.fetcher
      .load(doc, { clearPreviousData: true })
      .then((res) => {
        if (res.status === 404) doesntExist = true;
      })
      .catch(() => {
        shape.store.removeDocument(new NamedNode(doc));
        console.debug('Creating new document for shape...');
      });
    console.debug('error was catched');
    const { id } = data as { id: string };
    if (shape.store.any(new NamedNode(id), null, null, new NamedNode(doc))) {
      resolve({
        doc,
        errors: ['Node with id: ' + id + ' already exists in doc:' + doc],
      });
    }
    console.debug('Transform data into statements...');
    const [_, ins] = await shape.dataToStatements(data, doc);
    console.debug('Validating new statements...');
    const [newShape, errors] = await validateNewShape<
      ShapeType,
      CreateShapeArgs
    >(shape, id, [], ins);
    console.debug(
      'Creating new statements...',
      ins,
      newShape,
      errors,
      doesntExist,
    );
    if (!newShape || (errors && !doesntExist)) {
      resolve({ doc, errors });
    } else {
      if (!doesntExist) {
        await updateExisting(shape.updater, [], ins)
          .catch((err) => resolve({ doc, errors: [err] }))
          .then(() => resolve({ doc, data: newShape[0], errors }));
      } else {
        await createNew(shape.updater, doc, ins)
          .catch((err) => resolve({ doc, errors: [err] }))
          .then(() => resolve({ doc, data: newShape[0], errors }));
      }
    }
  });
}

export function validateNewShape<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  node: string,
  del: Statement[],
  ins: Statement[],
): Promise<ValidationResult<ShapeType>> {
  const updatedStore = new IndexedFormula();
  const changedNodes = [...del, ...ins].reduce((allNodes, st) => {
    const changed: string[] = [];
    if (allNodes.indexOf(st.subject.value) === -1) {
      changed.push(st.subject.value);
    }
    if (
      allNodes.indexOf(st.object.value) === -1 &&
      st.object.termType === 'NamedNode'
    ) {
      changed.push(st.object.value);
    }
    return [...allNodes, ...changed];
  }, [] as string[]);
  changedNodes.forEach((node) => {
    updatedStore.add(getAllStatementsOfNode(shape.store, new NamedNode(node)));
  });
  updatedStore.remove(del);
  updatedStore.add(ins);
  const { schema, context, prefixes, childContexts, type, id: shapeId } = shape;
  return validateShex<ShapeType>({
    ids: [node],
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
  ins: Statement[],
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
  ins: Statement[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    updater.put(
      new NamedNode(doc),
      ins,
      'text/turtle',
      async (_uri, ok, error) => {
        !ok ? reject(error) : resolve();
      },
    );
  });
}
