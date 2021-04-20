import { Shape } from "../../lib";
import {
  ResourceShape,
  ldpShapesShex,
  ResourceShapeContext,
  ResourceShapeType,
  resource,
  basicContainer,
} from "../resources/shex";

describe(".findAll()", () => {
  it("can find all instances of shape", async () => {
    const fromIri = "https://lalatest.solidcommunity.net/profile/";
    const testIri = "https://lalatest.solidcommunity.net/profile/card";
    const shape = await resource.findAll({
      from: fromIri,
    });
    const { from, data, errors } = shape;
    const card = data[2] as ResourceShape;
    expect(errors).toBeUndefined();
    expect(from).toBe(fromIri);
    expect(card.id).toBe(testIri);
    expect(card.type).toBe("http://www.w3.org/ns/ldp#Resource");
  });

  it("can find all instances of shape in multiple files", async () => {
    const fromIri1 = "https://lalatest.solidcommunity.net/profile/";
    const fromIri2 = "https://lalatest.solidcommunity.net/public/";
    const testIri = "https://lalatest.solidcommunity.net/profile/";
    const shape = await basicContainer.findAll({
      from: [fromIri1, fromIri2],
    });
    const { from, data, errors } = shape;
    const profileFolder = data?.find((folder) => folder.id === testIri);
    const card = profileFolder?.contains[0];
    expect(errors).toBeUndefined();
    expect(data.length).toBe(2);
    expect(from).toStrictEqual([fromIri1, fromIri2]);
    expect(profileFolder.id).toBe(testIri);
    expect(card.type).toBe("http://www.w3.org/ns/ldp#Resource");
  });

  it("should return an error for finding the wrong shape", async () => {
    const fromIri = "https://lalatest.solidcommunity.net/profile/";
    const resource = new Shape<ResourceShape>({
      id: "http://www.w3.org/ns/ldp#ResourceShape",
      shape: ldpShapesShex,
      context: ResourceShapeContext,
      type: ResourceShapeType,
    });
    const { errors } = await resource.findAll({
      from: fromIri,
      where: { id: [fromIri] },
    });
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      "validating https://lalatest.solidcommunity.net/profile/ as http://www.w3.org/ns/ldp#ResourceShape:",
      "    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    ]);
  });
});
