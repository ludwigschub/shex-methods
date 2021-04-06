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
    const secondIri = "https://lalatest.solidcommunity.net/profile/Button.png";
    const resource = new Shape<ResourceShape>({
      id: "http://www.w3.org/ns/ldp#ResourceShape",
      shape: solidLdpShex,
      context: ResourceContext,
    });
    const shape = await resource.findAll({
      from: fromIri,
      where: { id: [testIri, secondIri] },
    });
    const { from, data, errors } = shape;
    const card = data[0] as ResourceShape;
    expect(errors).toBeUndefined();
    expect(from).toBe(fromIri);
    expect(card.id).toBe(testIri);
    expect(card.type[0]).toBe("http://www.w3.org/ns/ldp#Resource");
    // expect(data["foaf:name"][0]).toBe("Tester");
    // expect(data.hasEmail[0]["vcard:value"][0]).toBe(
    //   "mailto:lalasepp@gmail.com"
    // );
  });

  it("should return an error for finding the wrong shape", async () => {
    const fromIri = "https://lalatest.solidcommunity.net/profile/";
    const testIri = "https://lalatest.solidcommunity.net/profile/";
    const resource = new Shape<ResourceShape>({
      id: "http://www.w3.org/ns/ldp#Resource",
      shape: solidLdpShex,
      context: ResourceContext,
    });
    const { errors } = await resource.findAll({
      from: fromIri,
      where: { id: [testIri] },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      "shape http://www.w3.org/ns/ldp#Resource not found in:\n  " +
        "http://www.w3.org/ns/ldp#BasicContainerShape\n  " +
        "http://www.w3.org/ns/ldp#ResourceShape",
    ]);
  });
});
