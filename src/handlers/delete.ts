import { NamedNode } from "rdflib";
import { Shape } from "../shape";

export interface DeleteArgs {
  doc: string;
  where: { id: string };
}

export async function deleteShape<ShapeType>(
  shape: Shape<ShapeType>,
  { doc, where }: DeleteArgs
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await shape.fetcher.load(doc).catch(reject);
    const { id } = where as { id: string };
    resolve(
      shape.updater.update(
        shape.store.statementsMatching(new NamedNode(id)),
        []
      )
    );
  });
}
