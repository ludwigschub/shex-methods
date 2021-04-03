import { Shape } from "../lib";

type SolidProfileShape = {
  name: string;
  hasEmail: {
    value: string;
  };
};

enum SolidProfileContext {
  "name" = "vcard:name",
  "hasEmail" = "vcard:hasEmail",
  "value" = "vcard:value",
}

it("can find one shape", async () => {
  const shapeId = "https://lalatest.solidcommunity.net/profile/card#me";
  const solidProfile = new Shape<SolidProfileShape>({
    shape: `
  
  `,
    context: SolidProfileContext,
  });
  const shape = await solidProfile.findOne(shapeId);
  const { id, data } = shape;
  expect(id).toBe(shapeId);
  expect(data.name).toBe("lala");
  expect(data["vcard:name"]).toBe("lala");
  expect(data["vcard:hasEmail"]["vcard:value"]).toBe("lala@lala.com");
});
