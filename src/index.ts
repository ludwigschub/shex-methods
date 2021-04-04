import { Fetcher, IndexedFormula, Serializer } from "rdflib";
import { Parser, Store } from "n3";
const shex = require("shex");
interface QueryResult<Type> {
  errors: any;
  data: Type;
  id: string;
}

interface ShapeConstructorArgs {
  id: string;
  shape: string;
  context: Record<string, string>;
}

export class Shape<ShapeType> {
  id: string;
  shape: string;
  schema: Record<string, any>[];
  context: Record<string, string>;
  store: IndexedFormula;
  fetcher: Fetcher;
  findAll: () => QueryResult<ShapeType>[];
  findOne: (id: string) => Promise<QueryResult<ShapeType>>;
  validateShex: (baseUrl: string) => any;
  constructor({ id, shape, context }: ShapeConstructorArgs) {
    this.id = id;
    this.shape = shape;
    this.schema = shex.Parser.construct(this.id).parse(this.shape);
    this.context = context;
    this.store = new IndexedFormula();
    this.fetcher = new Fetcher(this.store);

    this.findAll = () => findAll<ShapeType>();
    this.findOne = function (this: Shape<ShapeType>, id: string) {
      return findOne<ShapeType>(this, id);
    }.bind(this);
    this.validateShex = function (this: Shape<ShapeType>, baseUrl: string) {
      return validateShex<ShapeType>(this, baseUrl);
    }.bind(this);
  }
}

function findAll<ShapeType>() {
  return [] as QueryResult<ShapeType>[];
}

async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  id: string
): Promise<QueryResult<ShapeType>> {
  await shape.fetcher.load(id);
  const [data, errors] = await shape.validateShex(id);
  return {
    id,
    data,
    errors,
  } as QueryResult<ShapeType>;
}

async function validateShex<ShapeType>(
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

export default Shape;
