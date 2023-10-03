import { IndexedFormula, NamedNode, Statement } from 'rdflib'

import { QueryResult, Shape } from '../shape'
import {
  ValidationResult,
  getAllStatementsOfNode,
  validateShex,
} from '../validate'

export interface CreateArgs<CreateShapeArgs> {
  doc: string
  data: CreateShapeArgs & { id: string }
}

export async function create<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, data }: CreateArgs<CreateShapeArgs>,
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve) => {
    let doesntExist = false
    await shape.fetcher
      .load(doc, {
        clearPreviousData: true,
        headers: new Headers({ Accept: 'text/turtle' }),
      })
      .then((res) => {
        if (res.status === 404) doesntExist = true
      })
      .catch((err) => {
        if (err.status === 404) doesntExist = true
        shape.store.removeDocument(new NamedNode(doc))
      })
    const { id } = data as { id: string }
    if (shape.store.any(new NamedNode(id), null, null, new NamedNode(doc))) {
      resolve({
        doc,
        errors: ['Node with id: ' + id + ' already exists in doc:' + doc],
      })
    }
    const [_, ins] = await shape.dataToStatements(data, doc)
    const [newShape, errors] = await validateNewShape<
      ShapeType,
      CreateShapeArgs
    >(shape, id, [], ins, doc)
    if (!newShape || (errors && !doesntExist)) {
      resolve({ doc, errors })
    } else {
      if (!doesntExist) {
        await updateExisting(shape.store, [], ins)
          .catch((err) => resolve({ doc, errors: [err] }))
          .then(() => resolve({ doc, data: newShape[0], errors }))
      } else {
        await createNew(shape.store, doc, ins)
          .catch((err) => resolve({ doc, errors: [err] }))
          .then(() => resolve({ doc, data: newShape[0], errors }))
      }
    }
  })
}

export function validateNewShape<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  node: string,
  del: Statement[],
  ins: Statement[],
  doc: string,
): Promise<ValidationResult<ShapeType>> {
  const updatedStore = new IndexedFormula()
  const changedNodes = [...del, ...ins].reduce((allNodes, st) => {
    const changed: string[] = []
    if (allNodes.indexOf(st.subject.value) === -1) {
      changed.push(st.subject.value)
    }
    if (
      allNodes.indexOf(st.object.value) === -1 &&
      st.object.termType === 'NamedNode'
    ) {
      changed.push(st.object.value)
    }
    return [...allNodes, ...changed]
  }, [] as string[])
  changedNodes.forEach((node) => {
    updatedStore.add(
      getAllStatementsOfNode(shape.store, doc, new NamedNode(node)),
    )
  })
  updatedStore.remove(del)
  updatedStore.add(ins)
  const { schema, context, prefixes, childContexts, type, id: shapeId } = shape
  return validateShex<ShapeType>({
    ids: [node],
    schema,
    type,
    shapeId,
    prefixes,
    store: updatedStore,
    contexts: [context, ...childContexts],
  })
}

export function updateExisting(
  store: IndexedFormula,
  del: Statement[],
  ins: Statement[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    store.updater?.update(del, ins, (_doc, ok, err) => {
      if (ok) resolve()
      else reject(err)
    })
  })
}

function createNew(
  store: IndexedFormula,
  doc: string,
  ins: Statement[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    store.add(ins)
    store.fetcher
      ?.putBack(new NamedNode(doc), { withCredentials: false })
      .then((res) => {
        if (res.ok) resolve()
        else reject()
      })
  })
}
