import {
  BlankNode,
  IndexedFormula,
  NamedNode,
  Statement,
  Node,
  graph,
} from '@collaboware/rdflib';
import createSerializer from '@collaboware/rdflib/lib/serializer';
import { Schema } from 'shexj';
import { Parser, Store } from 'n3';
import { Quad_Object, Quad_Subject } from '@collaboware/rdflib/lib/tf-types';

import { Validated, validatedToDataResult } from './transform/rdfToData';
import { Shape } from './shape';

const shex = require('shex');

export interface ValidateArgs {
  doc?: string | string[];
  schema: Schema;
  store: IndexedFormula;
  statements?: Statement[];
  type?: string[];
  shapeId: string;
  ids?: string[];
  contexts: Record<string, string>[];
  prefixes: Record<string, string>;
}

export type ValidationResult<ShapeType> = [
  ShapeType[] | undefined,
  string[] | undefined,
];

export function validateShapes<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  ids: string[] | undefined,
  doc?: string | string[],
): Promise<ValidationResult<ShapeType>> {
  const {
    schema,
    context,
    prefixes,
    childContexts,
    type,
    store,
    id: shapeId,
  } = shape;
  return validateShex<ShapeType>({
    schema,
    prefixes,
    type,
    store,
    shapeId,
    contexts: [context, ...childContexts],
    ids,
    doc,
  });
}

export async function validateShex<ShapeType>({
  schema,
  store,
  type,
  ids,
  shapeId,
  contexts,
  prefixes,
  doc,
}: ValidateArgs): Promise<ValidationResult<ShapeType>> {
  const validator = shex.Validator.construct(schema, {
    results: 'api',
  });
  let n3db;
  if (doc) {
    const docExclusiveStore = graph();
    if (Array.isArray(doc)) {
      doc.map((d) => {
        docExclusiveStore.addAll(
          store.statementsMatching(null, null, null, new NamedNode(d)),
        );
      });
    } else {
      docExclusiveStore.addAll(
        store.statementsMatching(null, null, null, new NamedNode(doc)),
      );
    }
    n3db = await createN3DB(docExclusiveStore, type);
  } else {
    n3db = await createN3DB(store, type);
  }
  const [db, potentialShapes] = n3db;
  let allErrors: string[] | undefined = undefined;
  let allShapes: ShapeType[] | undefined = undefined;
  if (!ids && potentialShapes.length === 0) {
    return [undefined, ['No shapes found of type ' + shapeId]];
  }
  try {
    const validated = validator.validate(
      db,
      (ids ?? potentialShapes).map((id) => ({ node: id, shape: shapeId })),
    );
    validated.forEach((validation: any) => {
      const [foundShape, foundErrors] = mapValidationResult(
        shapeId,
        validation,
      );
      if (!foundErrors)
        allShapes = [
          ...(allShapes ?? []),
          validatedToDataResult({
            contexts,
            prefixes,
            ...foundShape,
          }) as ShapeType,
        ];
      if (foundErrors) {
        allErrors = [...(allErrors ?? []), ...foundErrors];
      }
    });
    return [allShapes, allErrors];
  } catch (err) {
    console.debug(err);
    return [undefined, [(err as { message: string }).message]];
  }
}

function mapValidationResult(shapeId: string, validated: any) {
  const foundErrors =
    validated.status === 'nonconformant' &&
    shex.Util.errsToSimple(validated.appinfo, validated.node, shapeId);
  const foundShapes =
    validated.status === 'conformant' &&
    ({
      validated: shex.Util.valToValues(validated.appinfo),
      baseUrl: validated.node,
      shapeUrl: validated.shape,
    } as Validated);
  return [foundShapes, foundErrors];
}

function getNodesFromStore(store: IndexedFormula, type?: string[]) {
  return (
    type
      ? type.reduce((allNodes: NamedNode[], type: string) => {
          return [
            ...allNodes,
            ...store.each(
              null,
              new NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
              new NamedNode(type),
            ),
          ] as NamedNode[];
        }, [])
      : store.each(null)
  ).filter((node: Node, index: number, allNodes: Node[]) => {
    return (
      allNodes.findIndex(
        (possiblySameNode: Node) => possiblySameNode.value === node.value,
      ) === index
    );
  });
}

export function getAllStatementsOfNode(
  store: IndexedFormula,
  doc: string,
  node?: Node | NamedNode | BlankNode,
): Statement[] {
  if (!node) {
    return [];
  }
  return [
    ...store
      .statementsMatching(node as Quad_Subject, null, null, new NamedNode(doc))
      .reduce((allStatements, statement) => {
        if (
          statement.object.termType === 'BlankNode' ||
          statement.object.termType === 'NamedNode'
        ) {
          const allObjectStatements = getAllStatementsOfNode(
            store,
            doc,
            statement.object,
          );
          return [...allStatements, statement, ...allObjectStatements];
        } else {
          return [...allStatements, statement];
        }
      }, [] as Statement[]),
    ...store.statementsMatching(
      null,
      null,
      node as Quad_Object,
      new NamedNode(doc),
    ),
  ];
}

function createN3DB(
  store: IndexedFormula,
  types?: string[],
): Promise<[any, string[]]> {
  const foundNodes = getNodesFromStore(store, types);
  const turtle = createSerializer(store).statementsToN3(store.statements);
  const n3Store = new Store();
  return new Promise((resolve, reject) => {
    new Parser({
      baseIRI: null,
      blankNodePrefix: '',
      format: 'text/turtle',
    }).parse(turtle as string, function (error: string, triple: any) {
      if (error) {
        reject(error);
      } else if (triple) {
        n3Store.addTriple(triple);
      } else {
        resolve([
          shex.Util.makeN3DB(n3Store),
          foundNodes.map((node) => node.value),
        ]);
      }
    });
  });
}
