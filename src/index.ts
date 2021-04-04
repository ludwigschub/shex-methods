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
  const validation = await shape.validateShex(id);
  let foundErrors: {};
  let foundShapes: ShapeType;
  foundErrors =
    validation.type === "Failure" &&
    shex.Util.errsToSimple(validation, id, shape.id);
  foundShapes =
    validation.type === "ShapeTest" && shex.Util.valToValues(validation);
  return {
    id,
    data: foundShapes,
    errors: foundErrors,
  } as QueryResult<ShapeType>;
}

async function validateShex<ShapeType>(
  shape: Shape<ShapeType>,
  baseUrl: string
) {
  const nTriplesStore = (await createN3Store(shape.store, baseUrl)) as {
    getTriplesByIRI: any;
  };
  const db = shex.Util.makeN3DB(nTriplesStore);
  const validator = shex.Validator.construct(shape.schema, {
    results: "api",
  });
  return validator.validate(db, baseUrl, shape.id);
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

function proxifyShape(
  shape: Record<string, any>,
  context: Record<string, string>
): Record<string, any> {
  return new Proxy(shape, {
    get: (target, key: string) => {
      const directValue = proxyGetHandler(target, key, context);
      if (directValue) return directValue;
      const contextKey = Object.keys(context).find((contextKey: string) => {
        const contextValue = context[contextKey];
        return contextValue === key;
      });
      return proxyGetHandler(target, contextKey as string, context);
    },
  });
}

function proxyGetHandler(
  target: any,
  key: string,
  context: Record<string, string>
) {
  if (typeof target[key] === "string") {
    return target[key];
  } else if (typeof target[key] === "object") {
    return proxifyShape(target[key], context);
  }
}

export default Shape;
