import { Fetcher, IndexedFormula, graph } from "rdflib";
import ttl_read from "@graphy/content.ttl.read";

interface BasicShape<Type> {
  data: Type;
  id: string;
}

interface ShapeConstructorArgs {
  shape: string;
  context: Record<string, string>;
}

export class Shape<ShapeType> {
  shape: string;
  context: Record<string, string>;
  store: IndexedFormula;
  fetcher: Fetcher;
  findAll: () => BasicShape<ShapeType>[];
  findOne: (id: string) => Promise<BasicShape<ShapeType>>;
  constructor({ shape, context }: ShapeConstructorArgs) {
    this.shape = shape;
    this.context = context;
    this.store = graph();
    this.fetcher = new Fetcher(this.store);

    this.findAll = () => findAll<ShapeType>();
    this.findOne = function (this: Shape<ShapeType>, id: string) {
      return findOne<ShapeType>(this, id);
    }.bind(this);
  }
}

function findAll<ShapeType>() {
  return [] as BasicShape<ShapeType>[];
}

async function findOne<ShapeType>(
  shape: Shape<ShapeType>,
  id: string
): Promise<BasicShape<ShapeType>> {
  const resource = (((await shape.fetcher.load(id)) as unknown) as {
    responseText: string;
  })?.responseText;
  console.debug(ttl_read(resource));
  const data = proxifyShape(
    { name: "lala", hasEmail: { value: "lala@lala.com" } },
    shape.context
  ) as ShapeType;
  return { id, data } as BasicShape<ShapeType>;
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
