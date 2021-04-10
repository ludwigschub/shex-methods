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
  const chat = new Shape<ChatShape>({
    id: "https://shaperepo.com/schemas/longChat#ChatShape",
    shape: chatShex,
    context: ChatShapeContext,
    type: ChatShapeType,
  });
  const badlyConfiguredChat = new Shape<ChatShape>({
    id: "https://shaperepo.com/schemas/longChat#ChatShape",
    shape: chatShex,
    context: { ...ChatShapeContext, created: "terms:created" },
    type: ChatShapeType,
  });

  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
  });

  it("can create one shape", async () => {
    const shape = await chat.create({
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
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(from).toBe(testDoc);
    expect(data.title).toBe("Test Chat");
    expect(data.author).toBe(webId);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  it("throws error when context doesn't match", async () => {
    const shape = await badlyConfiguredChat.create({
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
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `Could not find field name for: http://purl.org/dc/elements/1.1/created
Context objects used: 
[{\"type\":\"rdf:type\",\"author\":\"purl:author\",\"created\":\"terms:created\",\"title\":\"purl:title\",\"participation\":\"flow:participation\",\"sharedPreferences\":\"ui:sharedPreferences\"}]`,
    ]);
  });

  afterAll(async () => {
    await chat.delete({
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
