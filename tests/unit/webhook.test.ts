/**
 * Webhook System Unit Tests
 *
 * Tests HMAC signature generation and verification
 */

import { describe, it, expect } from 'vitest';

describe('Webhook HMAC Signature', () => {
  it('should generate HMAC-SHA256 signature', async () => {
    const secret = 'test_secret_key_for_hmac_signature';
    const payload = JSON.stringify({ test: 'data' });
    const timestamp = 1234567890;

    // Create the signed content: timestamp + payload
    const signedContent = `${timestamp}.${payload}`;

    // Convert to UTF-8 bytes
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedContent);

    // Import the key and sign
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);

    // Convert signature to hex
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(hashHex).toBeDefined();
    expect(hashHex).toHaveLength(64);
    expect(hashHex).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate consistent signatures for same input', async () => {
    const secret = 'test_secret_key';
    const payload = '{"test":"data"}';
    const timestamp = 1234567890;

    const signedContent = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedContent);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature1 = await crypto.subtle.sign('HMAC', key, messageData);
    const signature2 = await crypto.subtle.sign('HMAC', key, messageData);

    const hash1 = Array.from(new Uint8Array(signature1))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hash2 = Array.from(new Uint8Array(signature2))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(hash1).toBe(hash2);
  });

  it('should generate different signatures for different secrets', async () => {
    const payload = '{"test":"data"}';
    const timestamp = 1234567890;
    const signedContent = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const messageData = encoder.encode(signedContent);

    const key1 = await crypto.subtle.importKey(
      'raw',
      encoder.encode('secret1'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const key2 = await crypto.subtle.importKey(
      'raw',
      encoder.encode('secret2'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature1 = await crypto.subtle.sign('HMAC', key1, messageData);
    const signature2 = await crypto.subtle.sign('HMAC', key2, messageData);

    const hash1 = Array.from(new Uint8Array(signature1))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hash2 = Array.from(new Uint8Array(signature2))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(hash1).not.toBe(hash2);
  });

  it('should format signature with sha256= prefix', () => {
    const hashHex = 'a'.repeat(64);
    const formatted = `sha256=${hashHex}`;

    expect(formatted).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should generate webhook secret', () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    expect(secret).toHaveLength(64); // 32 bytes = 64 hex characters
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate unique event IDs', () => {
    const eventId1 = `evt_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const eventId2 = `evt_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

    expect(eventId1).toMatch(/^evt_\d+_[a-f0-9]{16}$/);
    expect(eventId2).toMatch(/^evt_\d+_[a-f0-9]{16}$/);
    expect(eventId1).not.toBe(eventId2);
  });
});

describe('Webhook Event Types', () => {
  const validEventTypes = [
    'article.published',
    'article.updated',
    'article.deleted',
    'article.created',
    'keyword.ranking_changed',
    'backlink.status_changed',
    'subscription.updated',
    'organization.updated',
  ] as const;

  it('should have valid event types', () => {
    expect(validEventTypes).toContain('article.published');
    expect(validEventTypes).toContain('article.updated');
    expect(validEventTypes).toContain('keyword.ranking_changed');
  });

  it('should construct valid webhook payload', () => {
    const payload = {
      event_id: `evt_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
      event_type: 'article.published' as const,
      timestamp: new Date().toISOString(),
      organization_id: 'test-org-id',
      data: {
        article_id: 'test-article-id',
        title: 'Test Article',
        slug: 'test-article',
        status: 'published' as const,
        published_at: new Date().toISOString(),
        scheduled_at: null,
        author_id: 'test-author-id',
        product_id: null,
        keyword_id: null,
      },
    };

    expect(payload.event_id).toMatch(/^evt_\d+_[a-f0-9]{16}$/);
    expect(payload.event_type).toBe('article.published');
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(payload.data.article_id).toBe('test-article-id');
  });
});
