import camelcase from "camelcase";
import path from "path";
import { Shape } from "./shape";

export function validatedToDataResult<ShapeType>(
  shape: Shape<ShapeType>,
  validated: any,
  baseUrl: string,
  shapeUrl: string
) {
  const absoluteData = validatedToAbsolute(validated, baseUrl);
  const data = absoluteToNormalized(
    absoluteData,
    shape.context,
    shape.prefixes
  );
  return proxifyShape(
    { __shapeName: shapeUrl, ...data },
    shape.context
  ) as ShapeType;
}

export function validatedToAbsolute(data: any, baseUrl: string): any {
  return Object.assign(
    { id: baseUrl },
    ...Object.keys(data).map((key) => {
      const value = data[key];
      if (Array.isArray(value)) {
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
  context: Record<string, string>,
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
        context,
        prefixes
      );
      if (contextKey) {
        const value = data[key];
        if (Array.isArray(value)) {
          return {
            [contextKey]: value.map((value) =>
              absoluteToNormalizedValue(value, context, prefixes)
            ),
          };
        } else {
          return {
            [contextKey]: absoluteToNormalizedValue(value, context, prefixes),
          };
        }
      } else {
        throw Error(`Unknown field found in data: ${key}`);
      }
    })
  );
}

export function absoluteToNormalizedValue(
  value: any,
  context: Record<string, string>,
  prefixes: Record<string, string>
): any {
  if (typeof value === "object") {
    return absoluteToNormalized(value, context, prefixes);
  } else if (typeof value === "string") {
    return value;
  } else {
    return value;
  }
}

export function getNormalizedKeyFromContextOrSchemaPrefixes(
  key: string,
  context: Record<string, string>,
  prefixes: Record<string, string>
) {
  return Object.keys(context).find((contextKey) => {
    const prefix = Object.keys(prefixes).find((prefix) => {
      return key.includes(prefixes[prefix]);
    });
    return context[contextKey] === `${prefix}:${normalizeUrl(key)}`;
  });
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
