import { Shape } from "../../lib";
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
} from "../resources/shex";

describe(".create()", () => {
  it("can find one shape", async () => {
    const testIri = "https://lalatest.solidcommunity.net/public/";
    const basicContainer = new Shape<ChatShape>({
      id: "http://www.w3.org/ns/ldp#ChatShape",
      shape: chatShex,
      context: ChatShapeContext,
      type: ChatShapeType,
    });
    const shape = await basicContainer.create({
      at: testIri,
      data: {
        id: testIri,
        type: ChatShapeType.LongChat,
        title: "Test Chat"
      } as ChatShape,
    });
    const { from } = shape;
    expect(from).toBe(testIri);
    // expect(data.name[0]).toBe("Tester");
    // expect(data["foaf:name"][0]).toBe("Tester");
    // expect(data.hasEmail[0]["vcard:value"][0]).toBe(
    //   "mailto:lalasepp@gmail.com"
    // );
  });

  // it("should return an error for finding the wrong shape", async () => {
  //   const testIri = "https://lalatest.solidcommunity.net/profile";
  //   const solidProfile = new Shape<BasicContainerShape>({
  //     id: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
  //     shape: ldpShex,
  //     context: BasicContainerContext,
  //     type: BasicContainerShapeType,
  //   });
  //   const { errors } = await solidProfile.findOne({
  //     from: testIri,
  //     where: { id: testIri },
  //   });
  //   expect(errors).toBeDefined();
  //   expect(errors).toStrictEqual([
  //     "validating https://lalatest.solidcommunity.net/profile as https://shaperepo.com/schemas/solidProfile#SolidProfileShape:",
  //     "    Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  //     "  OR",
  //     "  Missing property: http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  //   ]);
  // });
});
