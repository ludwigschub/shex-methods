import { IndexedFormula, Literal, NamedNode, Statement } from "rdflib";
import { Shape } from "../shape";

export function dataToStatements<ShapeType>(
  shape: Shape<ShapeType>,
  data: ShapeType,
  doc: string
) {
  const absoluteData = normalizedToAbsolute(
    data,
    shape.context,
    shape.prefixes
  );
  const ins = absoluteToStatements(absoluteData, doc);
  const del = oldFromNewStatements(shape.store, ins);
  return [ins, del] as [Statement[], Statement[]];
}

export function oldFromNewStatements(store: IndexedFormula, ins: Statement[]) {
  return ins.reduce((allDelStatements: Statement[], st: Statement) => {
    const oldStatements = store.statementsMatching(
      st.subject,
      st.predicate,
      null,
      st.graph
    );
    if (oldStatements.length > 0) {
      return [...allDelStatements, ...oldStatements];
    } else {
      return allDelStatements;
    }
  }, []);
}

export function absoluteToStatements(data: Record<string, any>, doc: string) {
  const { id, ...props } = data;
  return Object.keys(props).reduce((statements: Statement[], prop: string) => {
    const value = props[prop];
    const statement = absoluteNodeToStatements(id, prop, value, doc);
    if (Array.isArray(statement)) {
      return [...statements, ...statement];
    } else {
      return [...statements, statement];
    }
  }, []);
}

export function absoluteNodeToStatements(
  id: string,
  prop: string,
  value: any,
  doc: string
): Statement | Statement[] {
  if (typeof value !== "object") {
    let valueNode;
    try {
      valueNode = new NamedNode(value);
    } catch {
      valueNode = new Literal(value);
    }
    return new Statement(
      new NamedNode(id),
      new NamedNode(prop),
      valueNode,
      new NamedNode(doc)
    );
  } else if (Array.isArray(value)) {
    return value.reduce((allStatements, value) => {
      const statement = absoluteNodeToStatements(id, prop, value, doc);
      if (Array.isArray(statement)) {
        return [...allStatements, ...statement];
      } else {
        return [...allStatements, statement];
      }
    });
  } else {
    return absoluteToStatements(value, doc);
  }
}

export function normalizedToAbsolute(
  data: any,
  context: Record<string, string>,
  prefixes: Record<string, string>
) {
  let absoluteData: Record<string, any> = {};
  Object.keys(data).map((key) => {
    if (Array.isArray(data[key])) {
      const absoluteNodes = data[key].map((value: any) =>
        normalizedToAbsoluteNode(key, value, context, prefixes)
      );
      const absoluteKey = Object.keys(absoluteNodes)[0];
      absoluteData = {
        ...absoluteData,
        [absoluteKey]: Object.values(absoluteNodes),
      };
    } else {
      absoluteData = {
        ...absoluteData,
        ...normalizedToAbsoluteNode(key, data[key], context, prefixes),
      };
    }
  });
  return absoluteData;
}

export function normalizedToAbsoluteNode(
  key: string,
  value: any,
  context: Record<string, string>,
  prefixes: Record<string, string>
) {
  if (key === "id") {
    return { id: value };
  }
  const contextKey = context[key];
  const prefix = contextKey.split(":")[0];
  const absoluteKey = prefixes[prefix] + key;
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      [absoluteKey]: normalizedToAbsolute(value, context, prefixes),
    };
  } else {
    return { [absoluteKey]: value };
  }
}
