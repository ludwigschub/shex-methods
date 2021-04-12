import {
  BlankNode,
  IndexedFormula,
  NamedNode,
  Serializer,
  Statement,
} from "rdflib";
import { Parser, Store } from "n3";
import { Validated, validatedToDataResult } from "./transform/rdfToData";
import { Shape } from "./shape";

const shex = require("shex");

export interface ValidateArgs {
  schema: any;
  store: IndexedFormula;
  statements?: Statement[];
  type: string[];
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
  statements,
  type,
  ids,
  shapeId,
  contexts,
  prefixes,
}: ValidateArgs): Promise<ValidationResult<ShapeType>> {
  const validator = shex.Validator.construct(schema, {
    results: "api",
  });
  const [db, potentialShapes] = await createN3DB(store, type, statements);
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
    console.debug(err)
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

function getNodesOfTypeFromStore(store: IndexedFormula, type: string[]) {
  return type
    .reduce((allNodes: NamedNode[], type: string) => {
      return [
        ...allNodes,
        ...store.each(
          null,
          new NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          new NamedNode(type)
        ),
      ] as NamedNode[];
    }, [])
    .filter((node: NamedNode, index: number, allNodes: NamedNode[]) => {
      return (
        allNodes.findIndex(
          (possiblySameNode: NamedNode) => possiblySameNode.value === node.value
        ) === index
      );
    });
}

export function getAllStatementsOfNode(
  store: IndexedFormula,
  node: NamedNode | BlankNode
): Statement[] {
  const allSubjectStatements = store.statementsMatching(node);
  const allObjectStatements = allSubjectStatements.reduce(
    (allStatements, statement) => {
      if (
        statement.object.termType === "BlankNode" ||
        statement.object.termType === "NamedNode"
      ) {
        const allObjectStatements = getAllStatementsOfNode(
          store,
          statement.object
        );
        return [...allStatements, ...allObjectStatements];
      } else {
        return allStatements;
      }
    },
    [] as Statement[]
  );
  return [...allSubjectStatements, ...allObjectStatements];
}

function createN3DB(
  store: IndexedFormula,
  type: string[],
  statements?: Statement[]
): Promise<[any, string[]]> {
  const nodesOfType = getNodesOfTypeFromStore(store, type);
  const turtle = new Serializer(store).statementsToN3(
    statements ??
      nodesOfType.reduce((allStatements: Statement[], node: NamedNode) => {
        return [...allStatements, ...getAllStatementsOfNode(store, node)];
      }, [])
  );
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
          nodesOfType.map((node) => node.value),
        ]);
      }
    });
  });
}
