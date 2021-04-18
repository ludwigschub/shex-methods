import {
  BlankNode,
  IndexedFormula,
  Literal,
  NamedNode,
  Namespace,
  Statement,
  Variable,
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
    [shape.context, ...shape.childContexts],
    shape.prefixes
  );
  const ins = absoluteToStatements(shape.store, absoluteData, doc).filter(
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

export function absoluteToStatements(
  store: IndexedFormula,
  data: Record<string, any>,
  doc: string
) {
  const { id, ...props } = data;
  const statements = Object.keys(props).reduce(
    (statements: Statement[], prop: string) => {
      const value = props[prop];
      const statement = absoluteNodeToStatements(store, id, prop, value, doc);
      if (Array.isArray(statement)) {
        return [...statements, ...statement];
      } else {
        return [...statements, statement];
      }
    },
    []
  );
  return statements.filter((newSt, index, statements) => {
    return (
      statements.findIndex(
        (st) => JSON.stringify(st) === JSON.stringify(newSt)
      ) === index
    );
  });
}

export function safeNode(doc: string, id?: string | Variable) {
  let subject: NamedNode | BlankNode;
  if ((id as Variable)?.termType && (id as Variable)?.value)
    return id as Variable;
  if (!id) {
    const newNode = new URL(doc);
    newNode.hash = "id" + new Date().getMilliseconds();
    return new NamedNode(newNode.toString());
  }
  try {
    subject = new NamedNode(id as string);
  } catch {
    const newNode = new URL(doc);
    newNode.hash = "id" + new Date().getMilliseconds();
    subject = new NamedNode(newNode.toString());
  }
  return subject;
}

export function absoluteNodeToStatements(
  store: IndexedFormula,
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
      safeNode(doc, id),
      new NamedNode(prop),
      valueNode,
      new NamedNode(doc).doc()
    );
  } else if (Array.isArray(value)) {
    return value.reduce((allStatements: Statement[], value) => {
      const statements = absoluteToStatements(store, { id, ...value }, doc);
      return [...allStatements, ...statements];
    }, []);
  } else {
    if (typeof value.toISOString === "function") {
      return new Statement(
        new NamedNode(id),
        new NamedNode(prop),
        new Literal(value.toISOString(), null, xml("dateTime")),
        new NamedNode(doc).doc()
      );
    } else {
      const targetNode = safeNode(doc, id);
      let newOrExistingNode =
        store.any(targetNode, new NamedNode(prop), null) ??
        safeNode(doc, value.id);
      if (newOrExistingNode.termType === "BlankNode") {
        newOrExistingNode = safeNode(doc, value.id);
      }
      return [
        new Statement(
          new NamedNode(id),
          new NamedNode(prop),
          newOrExistingNode as Variable,
          new NamedNode(doc).doc()
        ),
        ...absoluteToStatements(
          store,
          { ...value, id: newOrExistingNode },
          doc
        ),
      ];
    }
  }
}

export function normalizedToAbsolute(
  data: any,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
) {
  let absoluteData: Record<string, any> = {};
  Object.keys(data).map((key) => {
    if (Array.isArray(data[key])) {
      const absoluteNodes = data[key].map((value: any) =>
        normalizedToAbsoluteNode(key, value, contexts, prefixes)
      );
      const absoluteKey = Object.keys(absoluteNodes)[0];
      absoluteData = {
        ...absoluteData,
        [absoluteKey]: Object.values(absoluteNodes),
      };
    } else {
      absoluteData = {
        ...absoluteData,
        ...normalizedToAbsoluteNode(key, data[key], contexts, prefixes),
      };
    }
  });
  return absoluteData;
}

export function normalizedToAbsoluteNode(
  key: string,
  nodeValue: any,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
) {
  if (key === "id") {
    return { id: nodeValue };
  }
  const contextKey = (contexts.find((context) => context[key]) ?? {})[key];
  if (!contextKey)
    throw new Error(
      "Key: " +
        key +
        " could not be found in context: " +
        JSON.stringify(contexts)
    );
  const prefix = contextKey.split(":")[0];
  const absoluteKey = prefixes[prefix] + key;
  if (
    typeof nodeValue === "object" &&
    !nodeValue.toISOString &&
    !(nodeValue?.termType && nodeValue.value)
  ) {
    return {
      [absoluteKey]: normalizedToAbsolute(nodeValue, contexts, prefixes),
    };
  } else {
    return { [absoluteKey]: nodeValue };
  }
}
