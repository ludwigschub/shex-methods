import { Fetcher, IndexedFormula } from "rdflib";
import { findAll } from "./handlers/findAll";
import { findOne } from "./handlers/findOne";
import { validatedToDataResult } from "./rdfTransform";
import { validateShex } from "./validate";
const shex = require("shex");

export interface QueryResult<Type> {
  errors: any;
  data: Type;
  id: string;
}

export interface ShapeConstructorArgs {
  id: string;
  shape: string;
  context: Record<string, string>;
}

export class Shape<ShapeType> {
  id: string;
  shape: string;
  schema: any;
  prefixes: any;
  context: Record<string, string>;
  store: IndexedFormula;
  fetcher: Fetcher;
  findAll: () => QueryResult<ShapeType>[];
  findOne: (id: string) => Promise<QueryResult<ShapeType>>;
  validateShex: (ids: string[]) => any;
  validatedToDataResult: (validated: any, baseUrl: string, shapeUrl: string) => ShapeType;
  constructor({ id, shape, context }: ShapeConstructorArgs) {
    this.id = id;
    this.shape = shape;
    this.schema = shex.Parser.construct(this.id).parse(this.shape);
    this.prefixes = {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      ...this.schema.prefixes,
    };
    this.context = context;
    this.store = new IndexedFormula();
    this.fetcher = new Fetcher(this.store);

    this.findAll = function (this: Shape<ShapeType>) {
      return findAll<ShapeType>(this);
    }.bind(this);
    this.findOne = function (this: Shape<ShapeType>, id: string) {
      return findOne<ShapeType>(this, id);
    }.bind(this);
    this.validateShex = function (this: Shape<ShapeType>, ids: string[]) {
      return validateShex<ShapeType>(this, ids);
    }.bind(this);
    this.validatedToDataResult = function (
      this: Shape<ShapeType>,
      validated: any,
      baseUrl: string,
      shapeUrl: string
    ) {
      return validatedToDataResult<ShapeType>(this, validated, baseUrl, shapeUrl);
    }.bind(this);
  }
}
