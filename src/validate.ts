import {
  BlankNode,
  IndexedFormula,
  NamedNode,
  Serializer,
  Statement,
} from "rdflib";
import { Parser, Store } from "n3";
import { Shape } from "./shape";

const shex = require("shex");

export async function validateShex<ShapeType>(
  shape: Shape<ShapeType>,
  ids?: string[]
) {
  const validator = shex.Validator.construct(shape.schema, {
    results: "api",
  });
  const [db, potentialShapes] = await createN3DB(shape.store, shape.type);
  let allErrors: string[] | undefined = undefined;
  let allShapes: ShapeType[] | undefined = undefined;
  if (!ids && potentialShapes.length === 0) {
    return [undefined, ["No shapes found of type " + shape.id]];
  }
  try {
    const validated = validator.validate(
      db,
      (ids ?? potentialShapes).map((id) => ({ node: id, shape: shape.id }))
    );
    validated.forEach((validation: any) => {
      const [foundShape, foundErrors] = mapValidationResult(shape, validation);
      if (!foundErrors) allShapes = [...(allShapes ?? []), foundShape];
      if (foundErrors) allErrors = [...(allErrors ?? []), ...foundErrors];
    });
    return [allShapes, allErrors];
  } catch (err) {
    console.debug(err)
    return [undefined, [err.message]];
  }
}

function mapValidationResult<ShapeType>(
  shape: Shape<ShapeType>,
  validated: any
) {
  let foundErrors: any;
  let foundShapes: ShapeType;
  foundErrors =
    validated.status === "nonconformant" &&
    shex.Util.errsToSimple(validated.appinfo, validated.node, shape.id);
  foundShapes = (validated.status === "conformant" &&
    shape.validatedToDataResult(
      shex.Util.valToValues(validated.appinfo),
      validated.node,
      validated.shape
    )) as ShapeType;
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

function getAllStatementsOfNode(
  store: IndexedFormula,
  node: NamedNode | BlankNode
): Statement[] {
  const allSubjectStatements = store.statementsMatching(node);
  const allObjectStatements = allSubjectStatements.reduce(
    (allStatements, statement) => {
      if (statement.object.termType === "BlankNode" || statement.object.termType === "NamedNode") {
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
  type: string[]
): Promise<[any, string[]]> {
  const nodesOfType = getNodesOfTypeFromStore(store, type);
  const turtle = new Serializer(store).statementsToN3(
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
