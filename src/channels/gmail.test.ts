import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock registry (registerChannel runs at import time)
vi.mock('./registry.js', () => ({ registerChannel: vi.fn() }));

import {
  GmailChannel,
  GmailChannelOpts,
  GmailInstanceConfig,
} from './gmail.js';

function makeOpts(overrides?: Partial<GmailChannelOpts>): GmailChannelOpts {
  return {
    onMessage: vi.fn(),
    onChatMetadata: vi.fn(),
    registeredGroups: () => ({}),
    ...overrides,
  };
}

const GMAIL2_CONFIG: GmailInstanceConfig = {
  credDir: '/tmp/.gmail-mcp-2',
  jidPrefix: 'gmail2',
  channelName: 'gmail2',
};

describe('GmailChannel', () => {
  let channel: GmailChannel;

  beforeEach(() => {
    channel = new GmailChannel(makeOpts());
  });

  describe('ownsJid', () => {
    it('returns true for gmail: prefixed JIDs', () => {
      expect(channel.ownsJid('gmail:abc123')).toBe(true);
      expect(channel.ownsJid('gmail:thread-id-456')).toBe(true);
    });

    it('returns false for non-gmail JIDs', () => {
      expect(channel.ownsJid('12345@g.us')).toBe(false);
      expect(channel.ownsJid('tg:123')).toBe(false);
      expect(channel.ownsJid('dc:456')).toBe(false);
      expect(channel.ownsJid('user@s.whatsapp.net')).toBe(false);
    });

    it('default config does not own gmail2: JIDs', () => {
      expect(channel.ownsJid('gmail2:abc')).toBe(false);
    });
  });

  describe('ownsJid (gmail2 config)', () => {
    let gmail2: GmailChannel;

    beforeEach(() => {
      gmail2 = new GmailChannel(makeOpts(), 60000, GMAIL2_CONFIG);
    });

    it('owns gmail2: prefixed JIDs', () => {
      expect(gmail2.ownsJid('gmail2:abc')).toBe(true);
      expect(gmail2.ownsJid('gmail2:thread-id-456')).toBe(true);
    });

    it('does not own gmail: prefixed JIDs', () => {
      expect(gmail2.ownsJid('gmail:abc')).toBe(false);
    });

    it('does not own other JIDs', () => {
      expect(gmail2.ownsJid('tg:123')).toBe(false);
      expect(gmail2.ownsJid('12345@g.us')).toBe(false);
    });
  });

  describe('name', () => {
    it('is gmail for default config', () => {
      expect(channel.name).toBe('gmail');
    });

    it('matches channelName from config', () => {
      const gmail2 = new GmailChannel(makeOpts(), 60000, GMAIL2_CONFIG);
      expect(gmail2.name).toBe('gmail2');
    });
  });

  describe('isConnected', () => {
    it('returns false before connect', () => {
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('sets connected to false', async () => {
      await channel.disconnect();
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe('constructor options', () => {
    it('accepts custom poll interval', () => {
      const ch = new GmailChannel(makeOpts(), 30000);
      expect(ch.name).toBe('gmail');
    });

    it('defaults to unread query when no filter configured', () => {
      const ch = new GmailChannel(makeOpts());
      const query = (
        ch as unknown as { buildQuery: () => string }
      ).buildQuery();
      expect(query).toBe('is:unread category:primary');
    });

    it('defaults with no options provided', () => {
      const ch = new GmailChannel(makeOpts());
      expect(ch.name).toBe('gmail');
    });
  });
});
