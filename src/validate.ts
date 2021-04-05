import { IndexedFormula, Serializer } from "rdflib";
import { Parser, Store } from "n3";
import { Shape } from "./shape";
const shex = require("shex");

export async function validateShex<ShapeType>(
  shape: Shape<ShapeType>,
  baseUrl: string
) {
  const nTriplesStore = await createN3Store(shape.store, baseUrl);
  const db = shex.Util.makeN3DB(nTriplesStore);
  const validator = shex.Validator.construct(shape.schema, {
    results: "api",
  });
  const validation = validator.validate(db, [
    { node: baseUrl, shape: shape.id },
  ])[0];
  let foundErrors: any;
  let foundShapes: ShapeType;
  foundErrors =
    validation.status === "nonconformant" &&
    shex.Util.errsToSimple(validation.appinfo, baseUrl, shape.id);
  foundShapes =
    validation.status === "conformant" &&
    shex.Util.valToValues(validation.appinfo);
  return [foundShapes, foundErrors];
}

function createN3Store(store: IndexedFormula, baseUrl: string) {
  const turtle = new Serializer(store).statementsToN3(
    store.statementsMatching()
  );
  const n3Store = new Store();
  return new Promise((resolve, reject) => {
    new Parser({
      baseIRI: baseUrl,
      blankNodePrefix: "",
      format: "text/turtle",
    }).parse(turtle as string, function (error: string, triple: any) {
      if (error) {
        reject("error parsing");
      } else if (triple) {
        n3Store.addTriple(triple);
      } else {
        resolve(n3Store);
      }
    });
  });
}