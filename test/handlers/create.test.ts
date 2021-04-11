import { Literal } from "rdflib";
import { SolidNodeClient } from "solid-node-client";
import { Shape } from "../../lib";
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
} from "../resources/shex";
const config = require("dotenv").config();

const webId = "https://lalatest.solidcommunity.net/profile/card#me";
const testDoc = "https://lalatest.solidcommunity.net/test/createChat";
const firstChatIri =
  "https://lalatest.solidcommunity.net/test/createChat#first";
const secondChatIri =
  "https://lalatest.solidcommunity.net/test/createChat#second";
const thirdChatIri =
  "https://lalatest.solidcommunity.net/test/createChat#third";
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

function clean() {
  return Promise.all([
    chat.delete({
      doc: testDoc,
      where: {
        id: firstChatIri,
      },
    }),
    chat.delete({
      doc: testDoc,
      where: {
        id: secondChatIri,
      },
    }),
  ]);
}

describe(".create()", () => {
  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
    await clean();
  });

  it("can create one shape", async () => {
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
    const { from, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(from).toBe(testDoc);
    expect(data.title).toBe("Test Chat");
    expect(data.author).toBe(webId);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  it("throws error when shape with id already exists in doc", async () => {
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
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      "Node with id: https://lalatest.solidcommunity.net/test/createChat#first already exists in doc:https://lalatest.solidcommunity.net/test/createChat",
    ]);
  });

  it("throws error when data doesn't match shex", async () => {
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: secondChatIri,
        type: ChatShapeType.LongChat,
        title: "Test Chat",
        author: webId,
        created: new Literal(new Date().toISOString()),
      } as ChatShape,
    });
    const { from, data, errors } = shape;
    expect(from).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join("\n")).toContain("mismatched datatype");
  });

  it("throws error when context doesn't match", async () => {
    const shape = await badlyConfiguredChat.create({
      doc: testDoc,
      data: {
        id: thirdChatIri,
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
      "validating https://lalatest.solidcommunity.net/test/createChat#third as https://shaperepo.com/schemas/longChat#ChatShape:",
      "    Missing property: http://purl.org/dc/elements/1.1/created",
    ]);
  });
});
