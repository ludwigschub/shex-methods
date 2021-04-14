// import { Literal } from "rdflib";
import { Literal } from "rdflib";
import { SolidNodeClient } from "solid-node-client";
import { Shape } from "../../lib";
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
  chat,
} from "../resources/shex";
const config = require("dotenv").config();

describe(".update()", () => {
  const webId = "https://lalatest.solidcommunity.net/profile/card#me";
  const testDoc = "https://lalatest.solidcommunity.net/test/updateChat";
  const firstChatIri =
    "https://lalatest.solidcommunity.net/test/updateChat#first";
  const badlyConfiguredChat = new Shape<ChatShape>({
    id: "https://shaperepo.com/schemas/longChat#ChatShape",
    shape: chatShex,
    context: { ...ChatShapeContext, title: "rdf:title" },
    type: ChatShapeType,
  });

  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
    badlyConfiguredChat.fetcher._fetch = client.fetch.bind(client);
    await chat.delete({
      doc: testDoc,
      where: {
        id: firstChatIri,
      },
    });
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

  it("throws error when data doesn't match cardinality", async () => {
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: (["Test Chat", "UpdatedChat"] as unknown) as string,
      } as ChatShape,
    });
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join("\n")).toContain("exceeds cardinality");
  });

  it("throws error when data doesn't match shex", async () => {
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        created: new Literal(new Date().toISOString()),
      } as ChatShape,
    });
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join("\n")).toContain("mismatched datatype");
  });

  it("throws error when transforming and context doesn't match", async () => {
    const shape = await badlyConfiguredChat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: "Test Chat",
      } as ChatShape,
    });
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `Could not find field name for: http://purl.org/dc/elements/1.1/title
Context objects used: 
[{\"type\":\"rdf:type\",\"author\":\"purl:author\",\"created\":\"purl:created\",\"title\":\"rdf:title\",\"participation\":\"flow:participation\",\"sharedPreferences\":\"ui:sharedPreferences\",\"message\":\"flow:message\"}]`,
    ]);
  });
});
