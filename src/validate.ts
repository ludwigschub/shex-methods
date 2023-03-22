import { InternalSchema } from '@shexjs/term';
import * as ShExUtil from '@shexjs/util';
import {
  ShExJsResultMap as ShExValidationResult, ShExJsResultMapEntry, ShExValidator
} from '@shexjs/validator';
import { Quad, Parser, Store } from 'n3';
import { Term } from "rdf-js";
import { NeighborhoodDb } from "@shexjs/neighborhood-api"
import {
  BlankNode, graph, IndexedFormula,
  NamedNode, Node, Statement
} from 'rdflib';
import createSerializer from 'rdflib/lib/serializer';
import { Quad_Object, Quad_Subject } from 'rdflib/lib/tf-types';
import { Schema } from 'shexj';
import { Failure, NodeTest, ShapeTest, SolutionList } from '@shexjs/term/shexv';

import { Shape } from './shape';
import { Validated, validatedToDataResult } from './transform/rdfToData';


const { ctor: RdfJsDb } = require("@shexjs/neighborhood-rdfjs")
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
  const validator = new ShExValidator(schema as InternalSchema, db, { coverage: { firstError: "eval-simple-1err", exhaustive: "" } });
  let allErrors: string[] | undefined = undefined;
  let allShapes: ShapeType[] | undefined = undefined;
  if (!ids && potentialShapes.length === 0) {
    return [undefined, ['No shapes found of type ' + shapeId]];
  }
  try {
    const validated =
      (ids ?? potentialShapes).map((id) => (validator.validateNodeShapePair(new NamedNode(id) as Term, shapeId))) as ShapeTest[]
    validated.forEach((validation) => {
      const [foundShape, foundErrors] = mapValidationResult(validation);
      if (!foundErrors && foundShape)
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
    return [undefined, [(err as { message: string }).message]];
  }
}

function mapValidationResult(validated: ShapeTest) {
  const foundErrors =
    !validated.solution &&
    ShExUtil.errsToSimple(validated);
  const foundShapes =
    validated.solution &&
    ({
      validated: ShExUtil.valToValues(validated.solution),
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
): Promise<[NeighborhoodDb, string[]]> {
  const foundNodes = getNodesFromStore(store, types);
  const turtle = createSerializer(store).statementsToN3(store.statements);
  const n3Store = new Store();
  return new Promise((resolve, reject) => {
    new Parser({
      baseIRI: undefined,
      blankNodePrefix: '',
      format: 'text/turtle',
    }).parse(turtle as string, function (error: Error, quad: Quad) {
      if (error) {
        reject(error.toString());
      } else if (quad) {
        n3Store.addQuad(quad);
      } else {
        resolve([
          RdfJsDb(n3Store),
          foundNodes.map((node) => node.value),
        ]);
      }
    });
  });
}
