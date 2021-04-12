import {
  IndexedFormula,
  Literal,
  NamedNode,
  Namespace,
  Statement,
} from "rdflib";
import { Shape } from "../shape";

const xml = Namespace("http://www.w3.org/2001/XMLSchema#");

export function dataToStatements<ShapeType>(
  shape: Shape<ShapeType>,
  data: Partial<ShapeType>,
  doc: string
) {
  const absoluteData = normalizedToAbsolute(
    data,
    shape.context,
    shape.prefixes
  );
  const ins = absoluteToStatements(absoluteData, doc).filter(
    ({ subject, predicate, object, graph }) =>
      !shape.store.any(subject, predicate, object, graph)
  );
  const del = oldFromNewStatements(shape.store, ins);
  return [del, ins] as [Statement[], Statement[]];
}

export function oldFromNewStatements(store: IndexedFormula, ins: Statement[]) {
  const oldStatements = ins.reduce(
    (allDelStatements: Statement[], st: Statement) => {
      const oldStatements = store.statementsMatching(
        st.subject,
        st.predicate,
        null,
        st.graph
      );
      return oldStatements.length > 0
        ? [...allDelStatements, ...oldStatements]
        : allDelStatements;
    },
    []
  );
  return oldStatements.filter((oldSt, index, statements) => {
    return (
      !ins.find((st) => JSON.stringify(st) === JSON.stringify(oldSt)) &&
      statements.findIndex(
        (st) => JSON.stringify(st) === JSON.stringify(oldSt)
      ) === index
    );
  });
}

export function absoluteToStatements(data: Record<string, any>, doc: string) {
  const { id, ...props } = data;
  const statements = Object.keys(props).reduce((statements: Statement[], prop: string) => {
    const value = props[prop];
    const statement = absoluteNodeToStatements(id, prop, value, doc);
    if (Array.isArray(statement)) {
      return [...statements, ...statement];
    } else {
      return [...statements, statement];
    }
  }, []);
  return statements.filter((newSt, index, statements) => {
    return (
      statements.findIndex(
        (st) => JSON.stringify(st) === JSON.stringify(newSt)
      ) === index
    );
  });
}

export function absoluteNodeToStatements(
  id: string,
  prop: string,
  value: any,
  doc: string
): Statement | Statement[] {
  const isNode =
    value?.termType === "NamedNode" ||
    value?.termType === "BlankNode" ||
    value?.termType === "Literal";
  if (typeof value !== "object" || isNode) {
    let valueNode;
    if (isNode) {
      valueNode = value;
    } else {
      try {
        valueNode = new NamedNode(value);
      } catch {
        valueNode = new Literal(value);
      }
    }
    return new Statement(
      new NamedNode(id),
      new NamedNode(prop),
      valueNode,
      new NamedNode(doc)
    );
  } else if (Array.isArray(value)) {
    return value.reduce((allStatements: Statement[], value) => {
      const statements = absoluteToStatements({ id, ...value }, doc);
      return [...allStatements, ...statements];
    }, []);
  } else {
    if (typeof value.toISOString === "function") {
      return new Statement(
        new NamedNode(id),
        new NamedNode(prop),
        new Literal(value.toISOString(), null, xml("dateTime")),
        new NamedNode(doc)
      );
    } else {
      return absoluteToStatements(value, doc);
    }
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
  nodeValue: any,
  context: Record<string, string>,
  prefixes: Record<string, string>
) {
  if (key === "id") {
    return { id: nodeValue };
  }
  const contextKey = context[key];
  const prefix = contextKey.split(":")[0];
  const absoluteKey = prefixes[prefix] + key;
  const prototype = Object.getPrototypeOf(nodeValue);
  if (
    typeof nodeValue === "object" &&
    !prototype &&
    !(nodeValue?.termType && nodeValue.value) &&
    !Array.isArray(nodeValue)
  ) {
    return {
      [absoluteKey]: normalizedToAbsolute(nodeValue, context, prefixes),
    };
  } else {
    return { [absoluteKey]: nodeValue };
  }
}
