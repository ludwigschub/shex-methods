import {
  BlankNode,
  IndexedFormula,
  NamedNode,
  Serializer,
  Statement,
  Node,
} from "rdflib";
import { Parser, Store } from "n3";
import { Validated, validatedToDataResult } from "./transform/rdfToData";
import { Shape } from "./shape";
import { Quad_Object, Quad_Subject } from "rdflib/lib/tf-types";

const shex = require("shex");

export interface ValidateArgs {
  schema: any;
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
  string[] | undefined
];

export function validateShapes<ShapeType>(
  shape: Shape<ShapeType>,
  ids: string[] | undefined
) {
  const {
    schema,
    context,
    prefixes,
    childContexts,
    type,
    store,
    id: shapeId,
  } = shape;
  return validateShex({
    schema,
    prefixes,
    type,
    store,
    shapeId,
    contexts: [context, ...childContexts],
    ids,
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
}: ValidateArgs): Promise<ValidationResult<ShapeType>> {
  const validator = shex.Validator.construct(schema, {
    results: "api",
  });
  const [db, potentialShapes] = await createN3DB(store, type);
  let allErrors: string[] | undefined = undefined;
  let allShapes: ShapeType[] | undefined = undefined;
  if (!ids && potentialShapes.length === 0) {
    return [undefined, ["No shapes found of type " + shapeId]];
  }
  try {
    const validated = validator.validate(
      db,
      (ids ?? potentialShapes).map((id) => ({ node: id, shape: shapeId }))
    );
    validated.forEach((validation: any) => {
      const [foundShape, foundErrors] = mapValidationResult(
        shapeId,
        validation
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
    return [undefined, [err.message]];
  }
}

function mapValidationResult(shapeId: string, validated: any) {
  let foundErrors: any;
  let foundShapes: any;
  foundErrors =
    validated.status === "nonconformant" &&
    shex.Util.errsToSimple(validated.appinfo, validated.node, shapeId);
  foundShapes =
    validated.status === "conformant" &&
    ({
      validated: shex.Util.valToValues(validated.appinfo),
      baseUrl: validated.node,
      shapeUrl: validated.shape,
    } as Validated);
  return [foundShapes, foundErrors];
}

function getNodesFromStore(store: IndexedFormula, type?: string[]) {
  return (type
    ? type.reduce((allNodes: NamedNode[], type: string) => {
        return [
          ...allNodes,
          ...store.each(
            null,
            new NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            new NamedNode(type)
          ),
        ] as NamedNode[];
      }, [])
    : store.each(null)
  ).filter((node: Node, index: number, allNodes: Node[]) => {
    return (
      allNodes.findIndex(
        (possiblySameNode: Node) => possiblySameNode.value === node.value
      ) === index
    );
  });
}

export function getAllStatementsOfNode(
  store: IndexedFormula,
  node: Node | NamedNode | BlankNode
): Statement[] {
  return [
    ...store
      .statementsMatching(node as Quad_Subject)
      .reduce((allStatements, statement) => {
        if (
          statement.object.termType === "BlankNode" ||
          statement.object.termType === "NamedNode"
        ) {
          const allObjectStatements = getAllStatementsOfNode(
            store,
            statement.object
          );
          return [...allStatements, statement, ...allObjectStatements];
        } else {
          return [...allStatements, statement];
        }
      }, [] as Statement[]),
    ...store.statementsMatching(null, null, node as Quad_Object),
  ];
}

function createN3DB(
  store: IndexedFormula,
  types?: string[]
): Promise<[any, string[]]> {
  const foundNodes = getNodesFromStore(store, types);
  const turtle = new Serializer(store).statementsToN3(store.statements);
  const n3Store = new Store();
  return new Promise((resolve, reject) => {
    new Parser({
      baseIRI: null,
      blankNodePrefix: "",
      format: "text/turtle",
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
