import { IndexedFormula, Serializer } from "rdflib";
import { Parser, Store } from "n3";
import { Shape } from "./shape";
const shex = require("shex");

export async function validateShex<ShapeType>(
  shape: Shape<ShapeType>,
  ids: string[]
) {
  const validator = shex.Validator.construct(shape.schema, {
    results: "api",
  });
  const db = await createN3DB(shape.store);
  let allErrors: string[] | undefined = undefined;
  let allShapes: ShapeType[] | undefined = undefined;
  const validated = validator.validate(
    db,
    ids.map((id) => ({ node: id, shape: shape.id }))
  );
  validated.forEach((validation: any) => {
    const [foundShape, foundErrors] = mapValidationResult(shape, validation);
    if (!foundErrors) allShapes = [...(allShapes ?? []), foundShape];
    if (foundErrors) allErrors = [...(allErrors ?? []), ...foundErrors];
  });
  return [allShapes, allErrors];
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

function createN3DB(store: IndexedFormula) {
  const turtle = new Serializer(store).statementsToN3(
    store.statementsMatching()
  );
  const n3Store = new Store();
  return new Promise((resolve, reject) => {
    new Parser({
      baseIRI: null,
      blankNodePrefix: "",
      format: "text/turtle",
    }).parse(turtle as string, function (error: string, triple: any) {
      if (error) {
        reject("error parsing");
      } else if (triple) {
        n3Store.addTriple(triple);
      } else {
        resolve(shex.Util.makeN3DB(n3Store));
      }
    });
  });
}
