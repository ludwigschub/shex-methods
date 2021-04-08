export type BasicContainerShape = {
  id: string
  type: string;
  modified: string;
  mtime: string;
  size: string;
  contains: ResourceShape[];
};

export enum BasicContainerShapeType {
  BasicContainer = "http://www.w3.org/ns/ldp#BasicContainer",
}

export enum BasicContainerContext {
  "type" = "rdf:type",
  "modified" = "terms:modified",
  "mtime" = "st:mtime",
  "size" = "st:size",
  "contains" = "ldp:contains",
}

export type ResourceShape = {
  id: string
  type: string | string[];
  modified: string;
  mtime: string;
  size: string;
};

export enum ResourceShapeType {
  Resource = "http://www.w3.org/ns/ldp#Resource",
}

export enum ResourceContext {
  "type" = "rdf:type",
  "modified" = "terms:modified",
  "mtime" = "st:mtime",
  "size" = "st:size",
}

export const ldpShex = `
PREFIX ldp: <http://www.w3.org/ns/ldp#>
PREFIX st: <http://www.w3.org/ns/posix/stat#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX terms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX tur: <http://www.w3.org/ns/iana/media-types/text/turtle#>

ldp:BasicContainerShape EXTRA a {
  a [ ldp:BasicContainer ]
    // rdfs:comment  "Defines the node as a Container" ;
  a [ ldp:Container ]
    // rdfs:comment  "Defines the node as a Container" ;
  ldp:contains @ldp:ResourceShape *
    // rdfs:comment  "Contains these Resources" ;
  st:size xsd:integer +
    // rdfs:comment  "Size of Container" ;
  st:mtime xsd:decimal + 
    // rdfs:comment  "Time of Container creation created" ;
  terms:modified xsd:dateTime + 
    // rdfs:comment  "Time the Container was modified" ;
}

ldp:ResourceShape EXTRA a {
  a [ ldp:Resource ]
    // rdfs:comment  "Defines the node as a Resource" ;
  st:size xsd:integer +
    // rdfs:comment  "Size of Container" ;
  st:mtime xsd:decimal + 
    // rdfs:comment  "Time of Container creation created" ;
  terms:modified xsd:dateTime + 
    // rdfs:comment  "Time the Container was modified" ;
}
`;
