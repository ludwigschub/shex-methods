import { Fetcher, IndexedFormula, UpdateManager } from "rdflib";
import { dataToStatements } from "./transform/dataToRdf";
import { create, CreateArgs } from "./handlers/create";
import { findAll, FindAllArgs } from "./handlers/findAll";
import { findOne, FindUniqueArgs } from "./handlers/findOne";
import { update, UpdateArgs } from "./handlers/update";
import { DeleteArgs, deleteShape } from "./handlers/delete";
const shex = require("shex");

export interface QueryResult<Type> {
  errors?: string[];
  data?: Type;
  from: string | string[];
}

export interface ShapeConstructorArgs {
  id: string;
  shape: string;
  context: Record<string, string>;
  childContexts?: Record<string, string>[];
  type?: Record<string, string> | string[];
}

export class Shape<ShapeType, CreateShapeArgs> {
  id: string;
  shape: string;
  schema: any;
  prefixes: any;
  type?: string[];
  context: Record<string, string>;
  childContexts: Record<string, string>[];
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
  constructor({
    id,
    shape,
    context,
    childContexts,
    type,
  }: ShapeConstructorArgs) {
    this.id = id;
    this.shape = shape;
    this.schema = shex.Parser.construct(this.id).parse(this.shape);
    this.prefixes = {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      ...this.schema.prefixes,
    };
    this.type = type && Object.values(type);
    this.context = context;
    this.childContexts = childContexts ?? [];
    this.store = new IndexedFormula();
    this.fetcher = new Fetcher(this.store);
    this.updater = new UpdateManager(this.store);
  }
  dataToStatements(
    this: Shape<ShapeType, CreateShapeArgs>,
    data: Partial<CreateShapeArgs>,
    doc: string
  ) {
    return dataToStatements<ShapeType, CreateShapeArgs>(this, data, doc);
  }
  findOne(this: Shape<ShapeType, CreateShapeArgs>, args: FindUniqueArgs) {
    return findOne<ShapeType, CreateShapeArgs>(this, args);
  }
  findAll(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: FindAllArgs<ShapeType>
  ) {
    return findAll<ShapeType, CreateShapeArgs>(this, args);
  }
  create(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: CreateArgs<CreateShapeArgs>
  ) {
    return create<ShapeType, CreateShapeArgs>(this, args);
  }
  update(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: UpdateArgs<CreateShapeArgs>
  ) {
    return update<ShapeType, CreateShapeArgs>(this, args);
  }
  delete(this: Shape<ShapeType, CreateShapeArgs>, args: DeleteArgs) {
    return deleteShape<ShapeType, CreateShapeArgs>(this, args);
  }
}
