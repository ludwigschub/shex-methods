import { NamedNode } from 'rdflib';

import { QueryResult, Shape } from '../shape';

export interface DeleteArgs {
  doc: string;
  where: { id: string };
}

export type DeleteQueryResult<ShapeType> = Omit<QueryResult<ShapeType>, 'data'>;

export async function deleteShape<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, where }: DeleteArgs,
): Promise<DeleteQueryResult<ShapeType>> {
  return new Promise(async (resolve) => {
    await shape.fetcher
      .load(doc, { force: true, clearPreviousData: true })
      .catch((err) => resolve({ doc, errors: [err] }));
    const { id } = where as { id: string };
    const statementsOfId = shape.store.statementsMatching(
      new NamedNode(id),
      null,
      null,
      new NamedNode(doc),
    );
    if (statementsOfId.length === 0) {
      resolve({ doc });
    }
    await shape.updater.update(statementsOfId, [], (_uri, ok, err) => {
      if (ok) {
        console.debug('Successfully deleted ' + id);
        resolve({ doc });
      } else {
        resolve({ doc, errors: [err as string] });
      }
    });
  });
}
