import {
  BlankNode,
  IndexedFormula,
  Literal,
  NamedNode,
  Namespace,
  Statement,
  Variable,
} from '@collaboware/rdflib';
import { v4 as uuid } from 'uuid';
import { Quad_Subject } from '@collaboware/rdflib/lib/tf-types';

import { Shape } from '../shape';

const xml = Namespace('http://www.w3.org/2001/XMLSchema#');

type PrimitiveNodeType = NamedNode | BlankNode | Literal | Date | URL | string;

export function dataToStatements<ShapeType, CreateShapeArgs>(
  shape: Shape<ShapeType, CreateShapeArgs>,
  data: Partial<CreateShapeArgs>,
  doc: string,
): [Statement[], Statement[]] {
  const absoluteData = normalizedToAbsolute(
    data,
    [shape.context, ...shape.childContexts],
    shape.prefixes,
  );
  const ins = absoluteToStatements(shape.store, absoluteData, doc);
  const delEmptyValues = deleteStatementsForEmptyValues(
    shape.store,
    absoluteData,
    doc,
  );
  const delOldValues = oldFromNewStatements(shape.store, ins);
  const del = [...delOldValues, ...delEmptyValues];
  return [
    del,
    ins.filter(
      ({ subject, predicate, object, graph }) =>
        shape.store.statementsMatching(subject, predicate, object, graph)
          .length === 0,
    ),
  ];
}

export function deleteStatementsForEmptyValues(
  store: IndexedFormula,
  data: Record<string, any>,
  doc: string,
): Statement[] {
  const { id } = data;
  return Object.keys(data).reduce(
    (allDelStatements: Statement[], key: string) => {
      if (isEmptyValue(data[key])) {
        const nodeToDelete = store.any(
          safeNode(doc, id),
          new NamedNode(key),
          null,
          new NamedNode(doc).doc(),
        );
        if (nodeToDelete) {
          return [
            ...allDelStatements,
            ...store.statementsMatching(nodeToDelete as Quad_Subject),
            ...store.statementsMatching(null, null, nodeToDelete),
          ];
        } else {
          return allDelStatements;
        }
      } else {
        return allDelStatements;
      }
    },
    [],
  );
}

export function oldFromNewStatements(
  store: IndexedFormula,
  ins: Statement[],
): Statement[] {
  const oldStatements = ins.reduce(
    (allDelStatements: Statement[], st: Statement) => {
      const oldStatements = store.statementsMatching(
        st.subject,
        st.predicate,
        null,
        st.graph,
      );
      return oldStatements.length > 0
        ? [...allDelStatements, ...oldStatements]
        : allDelStatements;
    },
    [],
  );
  return oldStatements.filter((oldSt, index, statements) => {
    return (
      !ins.find((st) => JSON.stringify(st) === JSON.stringify(oldSt)) &&
      statements.findIndex(
        (st) => JSON.stringify(st) === JSON.stringify(oldSt),
      ) === index
    );
  });
}

export function absoluteToStatements(
  store: IndexedFormula,
  data: Record<string, any>,
  doc: string,
): Statement[] {
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
    [],
  );
  return statements.filter((newSt, index, statements) => {
    return (
      statements.findIndex(
        (st) => JSON.stringify(st) === JSON.stringify(newSt),
      ) === index
    );
  });
}

export function safeNode(
  doc: string,
  id?: string | Variable,
): Variable | NamedNode {
  let subject: NamedNode | BlankNode;
  if ((id as Variable)?.termType && (id as Variable)?.value)
    return id as Variable;
  if (!id) {
    const newNode = new URL(doc);
    newNode.hash = 'id' + uuid();
    return new NamedNode(newNode.toString());
  }
  try {
    subject = new NamedNode(id as string);
  } catch {
    const newNode = new URL(doc);
    newNode.hash = 'id' + uuid();
    subject = new NamedNode(newNode.toString());
  }
  return subject;
}

export function isEmptyValue(
  obj: Record<string, any> | PrimitiveNodeType,
): boolean {
  return (
    (!obj && typeof obj !== 'number') ||
    (typeof obj === 'object' &&
      typeof (obj as Date).toISOString !== 'function' &&
      typeof (obj as URL).href !== 'string' &&
      Object.values(obj).filter((value: any | any[]) => !isEmptyValue(value))
        .length === 0)
  );
}

export function absoluteNodeToStatements(
  store: IndexedFormula,
  id: string,
  prop: string,
  value:
    | Record<string, any>
    | Record<string, any>[]
    | PrimitiveNodeType
    | PrimitiveNodeType[],
  doc: string,
): Statement | Statement[] {
  const isNode =
    (value as NamedNode)?.termType === 'NamedNode' ||
    (value as BlankNode)?.termType === 'BlankNode' ||
    (value as Literal)?.termType === 'Literal';
  if (isEmptyValue(value as Record<string, any> | PrimitiveNodeType)) {
    return [];
  }
  if (typeof value !== 'object' || isNode) {
    let valueNode;
    if (isNode) {
      valueNode = value;
    } else {
      try {
        valueNode = new NamedNode(value as string);
      } catch {
        if (typeof value === 'string') {
          valueNode = new Literal(value as string);
        } else if (typeof value === 'number') {
          if (String(value).indexOf('.') !== -1) {
            valueNode = new Literal(String(value), null, xml('decimal'));
          } else {
            valueNode = new Literal(String(value), null, xml('integer'));
          }
        }
      }
    }
    return new Statement(
      safeNode(doc, id),
      new NamedNode(prop),
      valueNode as Variable,
      new NamedNode(doc).doc(),
    );
  } else if (Array.isArray(value)) {
    return (value as Record<string, any>[]).reduce(
      (allStatements: Statement[], value) => {
        if (Object.keys(value).length > 1) {
          const newNode = safeNode(doc, (value as { id: string }).id);
          return [
            ...allStatements,
            new Statement(
              new NamedNode(id),
              new NamedNode(prop),
              newNode as Variable,
              new NamedNode(doc).doc(),
            ),
            ...absoluteToStatements(store, { ...value, id: newNode }, doc),
          ];
        } else {
          const statements = absoluteToStatements(store, { id, ...value }, doc);
          return [...allStatements, ...statements];
        }
      },
      [],
    );
  } else {
    if (typeof (value as Date).toISOString === 'function') {
      return new Statement(
        new NamedNode(id),
        new NamedNode(prop),
        new Literal((value as Date).toISOString(), null, xml('dateTime')),
        new NamedNode(doc).doc(),
      );
    } else if (typeof (value as URL).href === 'string') {
      return new Statement(
        new NamedNode(id),
        new NamedNode(prop),
        new NamedNode((value as URL).href),
        new NamedNode(doc).doc(),
      );
    } else {
      const newNode = safeNode(doc, (value as { id: string })?.id);
      return [
        new Statement(
          new NamedNode(id),
          new NamedNode(prop),
          newNode as Variable,
          new NamedNode(doc).doc(),
        ),
        ...absoluteToStatements(store, { ...value, id: newNode }, doc),
      ];
    }
  }
}

export function normalizedToAbsolute(
  data: Record<string, any>,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any | PrimitiveNodeType> {
  let absoluteData: Record<string, any> = {};
  Object.keys(data).map((key) => {
    if (Array.isArray(data[key])) {
      const absoluteNodes = data[key].map(
        (value: any): string | Record<string, any | PrimitiveNodeType> => {
          if (
            typeof value === 'object' &&
            !(value instanceof URL) &&
            !(value instanceof Date) &&
            !(value.termType || value.value)
          ) {
            return normalizedToAbsolute(value, contexts, prefixes);
          }
          return normalizedToAbsoluteNode(key, value, contexts, prefixes);
        },
      );
      const absoluteKey = getAbsoluteKey(key, prefixes, contexts);
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

function getAbsoluteKey(
  key: string,
  prefixes: Record<string, string>,
  contexts: Record<string, string>[],
): string {
  const contextKey = (contexts.find((context) => context[key]) ?? {})[key];
  if (!contextKey)
    throw new Error(
      'Key: ' +
        key +
        ' could not be found in context: ' +
        JSON.stringify(contexts),
    );
  const prefix = contextKey.split(':')[0];
  return prefixes[prefix] + key;
}

export function normalizedToAbsoluteNode(
  key: string,
  nodeValue: Record<string, any> | string,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any | PrimitiveNodeType> {
  if (key === 'id') {
    return { id: nodeValue };
  }
  const absoluteKey = getAbsoluteKey(key, prefixes, contexts);

  return { [absoluteKey]: nodeValue };
}
