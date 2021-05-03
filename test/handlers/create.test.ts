import { Literal } from 'rdflib';
import { SolidNodeClient } from 'solid-node-client';
import { Shape } from '../../lib';
import { podUrl } from '../common';
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
  chat,
  chatMessage,
  ChatShapeCreateArgs,
} from '../resources/shex';
const config = require('dotenv').config();

const webId = podUrl('profile/card#me');
const testDoc = podUrl('test/createChat');
const chatIri = podUrl('test/createChat#');
const firstChatIri = chatIri + 'first';
const secondChatIri = chatIri + 'second';
const badlyConfiguredChat = new Shape<ChatShape, ChatShapeCreateArgs>({
  id: 'https://shaperepo.com/schemas/longChat#ChatShape',
  shape: chatShex,
  context: { ...ChatShapeContext, created: 'terms:created' },
  type: ChatShapeType,
});

function clean() {
  return chat.delete({
    doc: testDoc,
    where: {
      id: firstChatIri,
    },
  });
}

describe('.create()', () => {
  jest.setTimeout(10000);
  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
    chatMessage.fetcher._fetch = client.fetch.bind(client);
    await clean();
  });

  it('can create one shape', async () => {
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: firstChatIri,
        type: ChatShapeType.LongChat,
        title: 'Test Chat',
        author: new URL(webId),
        created: new Date(),
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(testDoc);
    expect(data.title).toBe('Test Chat');
    expect(data.author).toBe(webId);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  it('can create one shape without type', async () => {
    const now = new Date();
    const message = await chatMessage.create({
      doc: testDoc,
      data: {
        id: chatIri + now.getMilliseconds(),
        content: 'Test Message',
        maker: new URL(webId),
        created: now,
      },
    });
    const { doc, data, errors } = message;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(testDoc);
    expect(data.content).toBe('Test Message');
    expect(data.maker).toBe(webId);
  });

  it("throws error when data doesn't match cardinality", async () => {
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: secondChatIri,
        type: ChatShapeType.LongChat,
        title: (['Test Chat', 'UpdatedChat'] as unknown) as string,
        author: new URL(webId),
        created: new Date(),
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join('\n')).toContain('exceeds cardinality');
  });

  it('throws error when shape with id already exists in doc', async () => {
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: firstChatIri,
        type: ChatShapeType.LongChat,
        title: 'Test Chat',
        author: new URL(webId),
        created: new Date(),
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `Node with id: ${podUrl(
        '/test/createChat#first',
      )} already exists in doc:${podUrl('/test/createChat')}`,
    ]);
  });

  it("throws error when data doesn't match shex", async () => {
    const shape = await chat.create({
      doc: testDoc,
      data: {
        id: secondChatIri,
        type: ChatShapeType.LongChat,
        title: 'Test Chat',
        author: new URL(webId),
        created: new Literal(new Date().toISOString()),
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join('\n')).toContain('mismatched datatype');
  });

  it("throws error when validating and context doesn't match", async () => {
    const shape = await badlyConfiguredChat.create({
      doc: testDoc,
      data: {
        id: secondChatIri,
        type: ChatShapeType.LongChat,
        title: 'Test Chat',
        author: new URL(webId),
        created: new Date(),
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `validating ${podUrl(
        '/test/createChat#second',
      )} as https://shaperepo.com/schemas/longChat#ChatShape:`,
      '    Missing property: http://purl.org/dc/elements/1.1/created',
    ]);
  });
});
