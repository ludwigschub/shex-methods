import { Fetcher, IndexedFormula } from "rdflib";
import { findAll } from "./findAll";
import { findOne } from "./findOne";
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

    this.findAll = function (this: Shape<ShapeType>) {
      return findAll<ShapeType>(this);
    }.bind(this);
    this.findOne = function (this: Shape<ShapeType>, id: string) {
      return findOne<ShapeType>(this, id);
    }.bind(this);
    this.validateShex = function (this: Shape<ShapeType>, baseUrl: string) {
      return validateShex<ShapeType>(this, baseUrl);
    }.bind(this);
  }
}
