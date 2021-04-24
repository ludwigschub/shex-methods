import camelcase from 'camelcase';

export interface Validated {
  validated: any;
  baseUrl: string;
  shapeUrl: string;
}

export function validatedToDataResult({
  validated,
  baseUrl,
  shapeUrl,
  contexts,
  prefixes,
}: {
  contexts: Record<string, string>[];
  prefixes: Record<string, string>;
} & Validated): Record<string, any> {
  const absoluteData = validatedToAbsolute(validated, baseUrl);
  const data = absoluteToNormalized(absoluteData, contexts, prefixes);
  return proxifyShape(
    { __shapeName: shapeUrl, id: validated.node, ...data },
    contexts,
    prefixes,
  );
}

export function validatedToAbsolute(
  data: Record<string, ValidatedNestedNode | ValidatedNode>,
  baseUrl: string,
): Record<string, any> {
  return Object.assign(
    { id: baseUrl },
    ...Object.keys(data).map((key) => {
      const value = data[key];
      if (Array.isArray(value)) {
        if (value.length === 1) {
          return { [key]: validatedToAbsoluteValue(value[0]) };
        }
        return { [key]: value.map((value) => validatedToAbsoluteValue(value)) };
      } else {
        return { [key]: validatedToAbsoluteValue(value) };
      }
    }),
  );
}

interface ValidatedNode {
  ldterm: string | { value: string };
}

interface ValidatedNestedNode {
  ldterm: string;
  nested: Record<string, ValidatedNestedNode | ValidatedNode>;
}

export function validatedToAbsoluteValue(
  value: ValidatedNestedNode | ValidatedNode,
): Record<string, any> | string {
  if ((value as ValidatedNestedNode).nested) {
    const { nested, ldterm } = value as ValidatedNestedNode;
    return validatedToAbsolute(nested, ldterm);
  } else if ((value as { ldterm: { value: string } }).ldterm.value) {
    return (value as { ldterm: { value: string } }).ldterm.value;
  } else {
    return (value as { ldterm: string }).ldterm;
  }
}

export function absoluteToNormalized(
  data: Record<string, any>,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any> {
  return Object.assign(
    {},
    ...Object.keys(data).map((key) => {
      if (key === 'id') {
        return { [key]: data[key] };
      }
      const contextKey = getNormalizedKeyFromContextOrSchemaPrefixes(
        key,
        contexts,
        prefixes,
      );
      if (contextKey) {
        const value = data[key];
        if (Array.isArray(value)) {
          return {
            [contextKey]: value.map((value) =>
              absoluteToNormalizedValue(value, contexts, prefixes),
            ),
          };
        } else if (typeof value === 'object') {
          return {
            [contextKey]: absoluteToNormalized(value, contexts, prefixes),
          };
        } else {
          return {
            [contextKey]: absoluteToNormalizedValue(value, contexts, prefixes),
          };
        }
      } else {
        throw Error(
          `Could not find field name for: ${key}\nContext objects used: \n${JSON.stringify(
            contexts,
          )}`,
        );
      }
    }),
  );
}

export function absoluteToNormalizedValue(
  value: Record<string, any>,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any> | string {
  if (typeof value === 'object') {
    return absoluteToNormalized(value, contexts, prefixes);
  } else {
    return value;
  }
}

export function getNormalizedKeyFromContextOrSchemaPrefixes(
  key: string,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): string {
  const prefix = Object.keys(prefixes).find((prefix) => {
    return key.includes(prefixes[prefix]);
  });
  const prefixedKey = `${prefix}:${normalizeUrl(key)}`;
  return contexts.reduce((key: string | undefined, context) => {
    if (!key)
      return Object.keys(context).find((key) => context[key] === prefixedKey);
    else return key;
  }, '') as string;
}

export function getNameOfPath(path: string): string {
  return path.substr(path.lastIndexOf('/') + 1).split('.')[0];
}

export function normalizeUrl(
  url: string,
  capitalize?: boolean,
  not?: string,
  prefixes?: Record<string, string>,
): string {
  const urlObject = new URL(url);
  let normalized = camelcase(
    urlObject.hash === ''
      ? getNameOfPath(urlObject.pathname)
      : urlObject.hash.replace(/#+/, ''),
  );

  if (not && normalized.toLowerCase() === not.toLowerCase()) {
    const namespaceUrl = url.replace(
      urlObject.hash === ''
        ? getNameOfPath(urlObject.pathname)
        : urlObject.hash,
      '',
    );
    const namespacePrefix = Object.keys(prefixes ?? {}).find(
      (key) => (prefixes ?? {})[key] === namespaceUrl,
    );
    normalized =
      namespacePrefix + normalized.replace(/^\w/, (c) => c.toUpperCase());
  }

  if (capitalize) {
    return normalized.replace(/^\w/, (c) => c.toUpperCase());
  }

  return normalized;
}

function proxifyShape(
  shape: Record<string, any>,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any> {
  return new Proxy(shape, {
    get: (target, key: string) => {
      const directValue = proxyGetHandler(target, key, contexts, prefixes);
      if (directValue) return directValue;
      const [prefix, normalizedKey] = key.split(':');
      if (!normalizedKey || !prefix) return undefined;
      if (contexts.find((context) => context[normalizedKey])) {
        return proxyGetHandler(target, normalizedKey, contexts, prefixes);
      } else {
        const absoluteKey = prefixes[prefix] + normalizedKey;
        const foundKey = getNormalizedKeyFromContextOrSchemaPrefixes(
          absoluteKey,
          contexts,
          prefixes,
        );
        return proxyGetHandler(target, foundKey, contexts, prefixes);
      }
    },
  });
}

function proxyGetHandler(
  target: Record<string, any>,
  key: string,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>,
): Record<string, any> {
  if (typeof target[key] === 'object') {
    return proxifyShape(target[key], contexts, prefixes);
  } else {
    return target[key];
  }
}
