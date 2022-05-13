import { QueryResult, Shape } from '../shape';

import { updateExisting, validateNewShape } from './create';

export interface UpdateArgs<CreateShapeArgs> {
  doc: string;
  data: Partial<CreateShapeArgs> & { id: string };
}

export function update<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  { doc, data }: UpdateArgs<CreateShapeArgs>,
): Promise<QueryResult<ShapeType>> {
  return new Promise(async (resolve) => {
    await shape.fetcher
      .load(doc, { clearPreviousData: true })
      .catch((err) => resolve({ doc, errors: [err] }));
    const [del, ins] = await shape.dataToStatements(data, doc);
    const [newShapes, errors] = await validateNewShape<
      ShapeType,
      CreateShapeArgs
    >(shape, data.id, del, ins, doc);
    if (!newShapes || errors) {
      resolve({ doc, errors });
    } else {
      await updateExisting(shape.updater, del, ins)
        .catch((err) => resolve({ doc, errors: [...(errors ?? []), err] }))
        .then(() => {
          resolve({ doc, data: newShapes[0], errors });
        });
    }
  });
}
