import { Shape } from "../lib";

type SolidProfileShape = {
  name: string;
  hasEmail: {
    value: string;
  };
};

enum SolidProfileContext {
  "type" = "rdf:type",
  "name" = "foaf:name",
  "hasEmail" = "vcard:hasEmail",
  "value" = "vcard:value",
}

const solidProfileShex = `
PREFIX srs: <https://shaperepo.com/schemas/solidProfile#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX schem: <http://schema.org/>
PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

srs:SolidProfileShape EXTRA a {
  a [ schem:Person ]
    // rdfs:comment  "Defines the node as a Person" ;
  a [ foaf:Person ]
    // rdfs:comment  "Defines the node as a Person" ;
  vcard:hasEmail @srs:EmailShape *
    // rdfs:comment  "The person's email." ;
  foaf:name xsd:string ?
    // rdfs:comment  "An alternate way to define a person's name" ;
}

srs:EmailShape EXTRA a {
  a [
    vcard:Dom
    vcard:Home
    vcard:ISDN
    vcard:Internet
    vcard:Intl
    vcard:Label
    vcard:Parcel
    vcard:Postal
    vcard:Pref
    vcard:Work
    vcard:X400
  ] ?
    // rdfs:comment  "The type of email." ;
  vcard:value IRI
    // rdfs:comment  "The value of an email as a mailto link (Example <mailto:jane@example.com>)" ;
}
`;

it("can find one shape", async () => {
  const testIri = "https://lalatest.solidcommunity.net/profile/card#me";
  const solidProfile = new Shape<SolidProfileShape>({
    id: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
    shape: solidProfileShex,
    context: SolidProfileContext,
  });
  const shape = await solidProfile.findOne(testIri);
  const { id, data } = shape;
  expect(id).toBe(testIri);
  expect(data.name[0]).toBe("Tester");
  expect(data["foaf:name"][0]).toBe("Tester");
  expect(data["vcard:hasEmail"][0]["vcard:value"][0]).toBe("mailto:lalasepp@gmail.com");
});

it("should return an error for finding the wrong shape", async () => {
  const testIri = "https://lalatest.solidcommunity.net/profile";
  const solidProfile = new Shape<SolidProfileShape>({
    id: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
    shape: solidProfileShex,
    context: SolidProfileContext,
  });
  const { errors } = await solidProfile.findOne(testIri);
  expect(errors).toBeDefined();
  expect(errors).toStrictEqual([
    "validating https://lalatest.solidcommunity.net/profile as https://shaperepo.com/schemas/solidProfile#SolidProfileShape:",
    "    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "  OR",
    "  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  ]);
});
