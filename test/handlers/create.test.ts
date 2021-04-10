import { SolidNodeClient } from "solid-node-client";
import { Shape } from "../../lib";
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
} from "../resources/shex";
const config = require("dotenv").config();

describe(".create()", () => {
  const webId = "https://lalatest.solidcommunity.net/profile/card#me";
  const testDoc = "https://lalatest.solidcommunity.net/public/chat";
  const testChatIri =
    "https://lalatest.solidcommunity.net/public/chat.ttl#this";
  const basicContainer = new Shape<ChatShape>({
    id: "https://shaperepo.com/schemas/longChat#ChatShape",
    shape: chatShex,
    context: ChatShapeContext,
    type: ChatShapeType,
  });

  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    basicContainer.fetcher._fetch = client.fetch.bind(client);
  });

  it("can create one shape", async () => {
    const shape = await basicContainer.create({
      doc: testDoc,
      data: {
        id: testChatIri,
        type: ChatShapeType.LongChat,
        title: "Test Chat",
        author: webId,
        created: new Date(),
      } as ChatShape,
    });
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data.title).toBe("Test Chat");
    // expect(data["foaf:name"][0]).toBe("Tester");
    // expect(data.hasEmail[0]["vcard:value"][0]).toBe(
    //   "mailto:lalasepp@gmail.com"
    // );
  });

  afterAll(async () => {
    await basicContainer.delete({
      doc: testDoc,
      where: {
        id: testChatIri,
      },
    });
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
