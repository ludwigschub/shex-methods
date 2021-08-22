// import { Literal } from "rdflib";
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
  solidProfile,
  EmailShape,
  ChatShapeCreateArgs,
} from '../resources/shex';

const config = require('dotenv').config();

describe('.update()', () => {
  jest.setTimeout(8000);
  const webId = podUrl('/profile/card#me');
  const testDoc = podUrl('/test/updateChat');
  const firstChatIri = podUrl('/test/updateChat#first');
  const badlyConfiguredChat = new Shape<ChatShape, ChatShapeCreateArgs>({
    id: 'https://shaperepo.com/schemas/longChat#ChatShape',
    shape: chatShex,
    context: { ...ChatShapeContext, title: 'rdf:title' },
    type: ChatShapeType,
  });

  beforeAll(async () => {
    const client = new SolidNodeClient();
    await client.login(config);
    chat.fetcher._fetch = client.fetch.bind(client);
    solidProfile.fetcher._fetch = client.fetch.bind(client);
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
        title: 'Test Chat',
        author: new URL(webId),
        created: new Date(),
      },
    });
    const profile = await solidProfile.findOne({
      doc: webId,
      where: { id: webId },
    });
    await solidProfile.update({
      doc: webId,
      data: {
        id: webId,
        hasEmail: {
          id: (profile.data.hasEmail as EmailShape).id,
          value: new URL('mailto:lalasepp@lalasepp.com'),
        },
      },
    });
    const { data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
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
    expect(data.author).toBe(webId);
    expect(data.type).toBe(ChatShapeType.LongChat);
  });

  it('deletes values if they are empty', async () => {
    const shape = await solidProfile.update({
      doc: webId,
      data: {
        id: webId,
        hasEmail: undefined,
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(webId);
    expect(data.hasEmail).toBeUndefined();
  });

  it('can update a shape with a nested value', async () => {
    const testString = 'mailto:lalasepp@gmail.com';
    const shape = await solidProfile.update({
      doc: webId,
      data: {
        id: webId,
        hasEmail: {
          value: new URL(testString),
        },
      },
    });
    const { doc, data, errors } = shape;
    expect(errors).toBeUndefined();
    expect(data).toBeDefined();
    expect(doc).toBe(webId);
    expect((data.hasEmail as EmailShape).value).toBe(testString);
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
    expect(errors.join('\n')).toContain('mismatched datatype');
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
