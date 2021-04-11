// import { Literal } from "rdflib";
import { SolidNodeClient } from "solid-node-client";
import { Shape } from "../../lib";
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
} from "../resources/shex";
const config = require("dotenv").config();

describe(".update()", () => {
  const webId = "https://lalatest.solidcommunity.net/profile/card#me";
  const testDoc = "https://lalatest.solidcommunity.net/test/updateChat";
  const firstChatIri =
    "https://lalatest.solidcommunity.net/test/updateChat#first";
  // const secondChatIri =
  //   "https://lalatest.solidcommunity.net/public/chat.ttl#second";
  const chat = new Shape<ChatShape>({
    id: "https://shaperepo.com/schemas/longChat#ChatShape",
    shape: chatShex,
    context: ChatShapeContext,
    type: ChatShapeType,
  });
  // const badlyConfiguredChat = new Shape<ChatShape>({
  //   id: "https://shaperepo.com/schemas/longChat#ChatShape",
  //   shape: chatShex,
  //   context: { ...ChatShapeContext, created: "terms:created" },
  //   type: ChatShapeType,
  // });

  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: firstChatIri,
        type: ChatShapeType.LongChat,
        title: "Test Chat",
        author: webId,
        created: new Date(),
      } as ChatShape,
    });
    const { data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
  });

  it("can update one shape", async () => {
    const testString = "Updated Chat";
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: testString,
      },
    });
    const { from, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(from).toBe(testDoc);
    expect(data.title).toBe(testString);
    expect(data.author).toBe(webId);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  //   it("throws error when data doesn't match shex", async () => {
  //     const shape = await chat.update({
  //       doc: testDoc,
  //       data: {
  //         id: secondChatIri,
  //         type: ChatShapeType.LongChat,
  //         title: "Test Chat",
  //         author: webId,
  //         created: new Literal(new Date().toISOString()),
  //       } as ChatShape,
  //     });
  //     const { from, data, errors } = shape;
  //     expect(from).toBe(testDoc);
  //     expect(data).toBeUndefined();
  //     expect(errors).toBeDefined();
  //     expect(errors.join("\n")).toContain("mismatched datatype");
  //   });

  //   it("throws error when context doesn't match", async () => {
  //     const shape = await badlyConfiguredChat.update({
  //       doc: testDoc,
  //       data: {
  //         id: firstChatIri,
  //         type: ChatShapeType.LongChat,
  //         title: "Test Chat",
  //         author: webId,
  //         created: new Date(),
  //       } as ChatShape,
  //     });
  //     const { from, data, errors } = shape;
  //     expect(from).toBe(testDoc);
  //     expect(data).toBeUndefined();
  //     expect(errors).toBeDefined();
  //     expect(errors).toStrictEqual([
  //       `Could not find field name for: http://purl.org/dc/elements/1.1/created
  // Context objects used:
  // [{\"type\":\"rdf:type\",\"author\":\"purl:author\",\"created\":\"terms:created\",\"title\":\"purl:title\",\"participation\":\"flow:participation\",\"sharedPreferences\":\"ui:sharedPreferences\"}]`,
  //     ]);
  //   });

  afterAll(async () => {
    await chat.delete({
      doc: testDoc,
      where: {
        id: firstChatIri,
      },
    });
    // await chat.delete({
    //   doc: testDoc,
    //   where: {
    //     id: secondChatIri,
    //   },
    // });
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
