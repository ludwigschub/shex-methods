import camelcase from "camelcase";
import path from "path";

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
} & Validated) {
  const absoluteData = validatedToAbsolute(validated, baseUrl);
  const data = absoluteToNormalized(absoluteData, contexts, prefixes);
  return proxifyShape(
    { __shapeName: shapeUrl, id: validated.node, ...data },
    contexts,
    prefixes
  );
}

export function validatedToAbsolute(data: any, baseUrl: string): any {
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
    })
  );
}

export function validatedToAbsoluteValue(value: any) {
  if (value.nested) {
    return validatedToAbsolute(value.nested, value.ldterm);
  } else if (value.ldterm.value) {
    return value.ldterm.value;
  } else {
    return value.ldterm;
  }
}

export function absoluteToNormalized(
  data: any,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
) {
  return Object.assign(
    {},
    ...Object.keys(data).map((key) => {
      if (key === "id") {
        return { [key]: data[key] };
      }
      const contextKey = getNormalizedKeyFromContextOrSchemaPrefixes(
        key,
        contexts,
        prefixes
      );
      if (contextKey) {
        const value = data[key];
        if (Array.isArray(value)) {
          return {
            [contextKey]: value.map((value) =>
              absoluteToNormalizedValue(value, contexts, prefixes)
            ),
          };
        } else {
          return {
            [contextKey]: absoluteToNormalizedValue(value, contexts, prefixes),
          };
        }
      } else {
        throw Error(
          `Could not find field name for: ${key}\nContext objects used: \n${JSON.stringify(
            contexts
          )}`
        );
      }
    })
  );
}

export function absoluteToNormalizedValue(
  value: any,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
): any {
  if (typeof value === "object") {
    return absoluteToNormalized(value, contexts, prefixes);
  } else {
    return value;
  }
}

export function getNormalizedKeyFromContextOrSchemaPrefixes(
  key: string,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
) {
  const prefix = Object.keys(prefixes).find((prefix) => {
    return key.includes(prefixes[prefix]);
  });
  const prefixedKey = `${prefix}:${normalizeUrl(key)}`;
  return contexts.reduce((key: string | undefined, context) => {
    if (!key)
      return Object.keys(context).find((key) => context[key] === prefixedKey);
    else return key;
  }, "");
}

export function normalizeUrl(
  url: string,
  capitalize?: boolean,
  not?: string,
  prefixes?: any
) {
  const urlObject = new URL(url);
  let normalized = camelcase(
    urlObject.hash === ""
      ? path.parse(urlObject.pathname).name
      : urlObject.hash.replace(/#+/, "")
  );

  if (not && normalized.toLowerCase() === not.toLowerCase()) {
    const namespaceUrl = url.replace(
      urlObject.hash === ""
        ? path.parse(urlObject.pathname).name
        : urlObject.hash,
      ""
    );
    const namespacePrefix = Object.keys(prefixes).find(
      (key) => prefixes[key] === namespaceUrl
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
  prefixes: Record<string, string>
): Record<string, any> {
  return new Proxy(shape, {
    get: (target, key: string) => {
      const directValue = proxyGetHandler(target, key, contexts, prefixes);
      if (directValue) return directValue;
      const [prefix, normalizedKey] = key.split(":");
      if (contexts.find((context) => context[normalizedKey])) {
        return proxyGetHandler(target, normalizedKey, contexts, prefixes);
      } else {
        const absoluteKey = prefixes[prefix] + normalizedKey;
        const foundKey = getNormalizedKeyFromContextOrSchemaPrefixes(
          absoluteKey,
          contexts,
          prefixes
        );
        if (foundKey)
          return proxyGetHandler(target, foundKey, contexts, prefixes);
      }
    },
  });
}

function proxyGetHandler(
  target: any,
  key: string,
  contexts: Record<string, string>[],
  prefixes: Record<string, string>
) {
  if (typeof target[key] === "string") {
    return target[key];
  } else if (typeof target[key] === "object") {
    return proxifyShape(target[key], contexts, prefixes);
  }
}
