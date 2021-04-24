import { NamedNode } from "rdflib";

import { Shape } from "../shape";

export interface DeleteArgs {
  doc: string;
  where: { id: string };
}

export async function deleteShape<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, where }: DeleteArgs
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await shape.fetcher.load(doc).catch(reject);
    const { id } = where as { id: string };
    const statementsOfId = shape.store.statementsMatching(new NamedNode(id));
    if (statementsOfId.length === 0) {
      resolve();
    }
    await shape.updater.update(statementsOfId, [], (_uri, ok, err) => {
      if (ok) {
        console.debug("Successfully deleted " + id);
        resolve();
      } else {
        reject(err);
      }
    });
  });
}
