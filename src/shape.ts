import {
  Fetcher,
  Statement,
  UpdateManager,
  graph,
  IndexedFormula,
} from 'rdflib';
import { Schema } from 'shexj';

import { dataToStatements } from './transform/dataToRdf';
import { create, CreateArgs } from './handlers/create';
import { findAll, FindAllArgs } from './handlers/findAll';
import { findOne, FindUniqueArgs } from './handlers/findOne';
import { update, UpdateArgs } from './handlers/update';
import { DeleteArgs, DeleteQueryResult, deleteShape } from './handlers/delete';

const shex = require('shex');

export interface QueryResult<Type> {
  errors?: string[];
  data?: Type;
  doc: string | string[];
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
  schema: Schema;
  prefixes: Record<string, string>;
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
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      ...(this.schema as Schema & { prefixes: Record<string, string> })
        .prefixes,
    };
    this.type = type && Object.values(type);
    this.context = context;
    this.childContexts = childContexts ?? [];
    this.store = graph();
    this.fetcher = new Fetcher(this.store);
    this.updater = new UpdateManager(this.store);
  }
  dataToStatements(
    this: Shape<ShapeType, CreateShapeArgs>,
    data: Partial<CreateShapeArgs>,
    doc: string,
  ): [Statement[], Statement[]] {
    return dataToStatements<ShapeType, CreateShapeArgs>(this, data, doc);
  }
  findOne(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: FindUniqueArgs,
  ): Promise<QueryResult<ShapeType>> {
    return findOne<ShapeType, CreateShapeArgs>(this, args);
  }
  findAll(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: FindAllArgs<ShapeType>,
  ): Promise<QueryResult<ShapeType[]>> {
    return findAll<ShapeType, CreateShapeArgs>(this, args);
  }
  create(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: CreateArgs<CreateShapeArgs>,
  ): Promise<QueryResult<ShapeType>> {
    return create<ShapeType, CreateShapeArgs>(this, args);
  }
  update(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: UpdateArgs<CreateShapeArgs>,
  ): Promise<QueryResult<ShapeType>> {
    return update<ShapeType, CreateShapeArgs>(this, args);
  }
  delete(
    this: Shape<ShapeType, CreateShapeArgs>,
    args: DeleteArgs,
  ): Promise<DeleteQueryResult<ShapeType>> {
    return deleteShape<ShapeType, CreateShapeArgs>(this, args);
  }
}
