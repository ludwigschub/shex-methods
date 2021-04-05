import { Shape } from "../../lib";
import {
  ResourceShape,
  solidLdpShex,
  ResourceContext,
} from "../resources/findAll";

describe(".findAll()", () => {
  it("can find all instances of shape", async () => {
    const fromIri = "https://lalatest.solidcommunity.net/profile/";
    const testIri = "https://lalatest.solidcommunity.net/profile/card";
    const resource = new Shape<ResourceShape>({
      id: "http://www.w3.org/ns/ldp#ResourceShape",
      shape: solidLdpShex,
      context: ResourceContext,
    });
    const shape = await resource.findAll({
      from: fromIri,
      where: { id: [testIri] },
    });
    const { from, data, errors } = shape;
    console.debug(data, errors);
    expect(from[0]).toBe(testIri);
    expect(data.name[0]).toBe("Tester");
    // expect(data["foaf:name"][0]).toBe("Tester");
    // expect(data.hasEmail[0]["vcard:value"][0]).toBe(
    //   "mailto:lalasepp@gmail.com"
    // );
  });

  it("should return an error for finding the wrong shape", async () => {
    const testIri = "https://lalatest.solidcommunity.net/profile/";
    const resource = new Shape<ResourceShape>({
      id: "http://www.w3.org/ns/ldp#Resource",
      shape: solidLdpShex,
      context: ResourceContext,
    });
    const { errors } = await resource.findAll({
      from: testIri,
      where: { id: [testIri] },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      "validating https://lalatest.solidcommunity.net/profile as https://shaperepo.com/schemas/solidProfile#SolidProfileShape:",
      "    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "  OR",
      "  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    ]);
  });
});
