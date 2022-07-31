import { Literal } from 'rdflib';

import { Shape } from '../../lib';
import { podUrl } from '../common';
import {
  chatShex,
  ChatShape,
  ChatShapeType,
  ChatShapeContext,
  chat,
  solidProfile,
  ChatShapeCreateArgs,
  ModeType,
  TrustedAppShape,
  SolidProfileShapeType,
} from '../resources/shex';
import setupTests from '../setupTests';

const badlyConfiguredChat = new Shape<ChatShape, ChatShapeCreateArgs>({
  id: 'https://shaperepo.com/schemas/longChat#ChatShape',
  shape: chatShex,
  context: { ...ChatShapeContext, title: 'rdf:title' },
  type: ChatShapeType,
});

const client = setupTests();
chat.fetcher._fetch = client.fetch.bind(client);
solidProfile.fetcher._fetch = client.fetch.bind(client);
badlyConfiguredChat.fetcher._fetch = client.fetch.bind(client);

describe('.update()', () => {
  jest.setTimeout(8000);
  const profileDoc = podUrl('/test/profile.ttl');
  const profileIri = podUrl('/test/profile.ttl');
  const testDoc = podUrl('/test/updateChat.ttl');
  const firstChatIri = podUrl('/test/updateChat.ttl#first');

  beforeAll(async () => {
    const chatShape = await chat.create({
      doc: testDoc,
      data: {
        id: firstChatIri,
        type: ChatShapeType.LongChat,
        title: 'Test Chat',
        author: new URL(profileIri),
        created: new Date(),
        sharedPreferences: new URL(podUrl('/test/settings')),
      },
    });
    const profileShape = await solidProfile.create({
      doc: profileDoc,
      data: {
        id: profileIri,
        type: [
          SolidProfileShapeType.FoafPerson,
          SolidProfileShapeType.SchemPerson,
        ],
        name: 'Lala',
        trustedApp: [
          {
            mode: [
              ModeType.Append,
              ModeType.Control,
              ModeType.Read,
              ModeType.Write,
            ],
            origin: new URL('http://example.org'),
          },
        ],
      },
    });
    expect(chatShape.errors).toBeUndefined();
    expect(chatShape.data).toBeDefined();
    expect(profileShape.errors).toBeUndefined();
    expect(profileShape.data).toBeDefined();
  });

  it('can update one shape', async () => {
    const testString = 'Updated Chat';
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: testString,
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(testDoc);
    expect(data.title).toBe(testString);
    expect(data.author).toBe(profileIri);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  it('deletes values if they are empty', async () => {
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        sharedPreferences: undefined,
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(testDoc);
    expect(data.sharedPreferences).toBeUndefined();
  });

  it('can update a shape with a nested value', async () => {
    const firstTestString = 'https://lalatest.org/';
    const secondTestString = 'https://lalatester.org/';
    const shape = await solidProfile.update({
      doc: profileDoc,
      data: {
        id: profileIri,
        trustedApp: [
          {
            mode: [ModeType.Read, ModeType.Write],
            origin: new URL(firstTestString),
          },
          {
            mode: [ModeType.Read, ModeType.Write],
            origin: new URL(secondTestString),
          },
        ],
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(profileIri);
    expect((data.trustedApp as TrustedAppShape)[0].origin).toBeDefined();
  });

  it("throws error when data doesn't match cardinality", async () => {
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: ['Test Chat', 'UpdatedChat'] as unknown as string,
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join('\n')).toContain('exceeds cardinality');
  });

  it("throws error when data doesn't match shex", async () => {
    const shape = await chat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        created: new Literal(new Date().toISOString()),
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors.join('\n')).toContain('Missing property');
  });

  it("throws error when transforming and context doesn't match", async () => {
    const shape = await badlyConfiguredChat.update({
      doc: testDoc,
      data: {
        id: firstChatIri,
        title: 'Test Chat',
      },
    });
    const { doc, data, errors } = shape;
    expect(doc).toBe(testDoc);
    expect(data).toBeUndefined();
    expect(errors).toBeDefined();
    expect(errors).toStrictEqual([
      `Could not find field name for: http://purl.org/dc/elements/1.1/title
Context objects used: 
[{"type":"rdf:type","author":"purl:author","created":"purl:created","title":"rdf:title","participation":"flow:participation","sharedPreferences":"ui:sharedPreferences","message":"flow:message"}]`,
    ]);
  });
});
