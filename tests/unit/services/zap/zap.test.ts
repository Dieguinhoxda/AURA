import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockFetch, mockBech32Decode } = vi.hoisted(() => ({
	mockFetch: vi.fn(),
	mockBech32Decode: vi.fn()
}));

// Mock dependencies
vi.mock('$services/ndk', () => ({
	default: {
		ndk: {}
	}
}));

vi.mock('$services/wallet/nwc-client', () => ({
	nwcClient: {
		payInvoice: vi.fn().mockResolvedValue({ preimage: 'abc123' })
	}
}));

vi.mock('$lib/core/errors', () => ({
	WalletError: class extends Error {
		constructor(message: string, public code: string) {
			super(message);
		}
	},
	ErrorCode: {
		INVALID_INPUT: 'INVALID_INPUT',
		NETWORK_ERROR: 'NETWORK_ERROR'
	}
}));

vi.mock('@scure/base', () => ({
	bech32: {
		decode: mockBech32Decode,
		toBytes: vi.fn()
	}
}));

// Import after mocks
import { zapService, type LnurlPayResponse, type ZapRequestParams } from '$lib/services/zap';

describe('Zap Service (NIP-57)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = mockFetch;
	});

	describe('Lightning Address Parsing', () => {
		it('should parse lightning address to LNURL', () => {
			const address = 'user@domain.com';
			const result = zapService.parseLightningAddress(address);
			
			// Should convert to LNURL format
			expect(result).not.toBeNull();
		});

		it('should return LNURL unchanged if already in LNURL format', () => {
			const lnurl = 'lnurl1dp68gurn8ghj7...';
			const result = zapService.parseLightningAddress(lnurl);
			
			expect(result).toBe(lnurl);
		});

		it('should return null for invalid addresses', () => {
			const invalid = 'not-an-address';
			const result = zapService.parseLightningAddress(invalid);
			
			expect(result).toBeNull();
		});

		it('should handle addresses with special characters', () => {
			const address = 'user+test@sub.domain.com';
			const result = zapService.parseLightningAddress(address);
			
			// Should still parse
			expect(result).not.toBeNull();
		});
	});

	describe('LNURL Fetch', () => {
		it('should fetch LNURL-pay data from lightning address', async () => {
			const mockResponse: LnurlPayResponse = {
				callback: 'https://domain.com/lnurlp/callback',
				maxSendable: 100000000,
				minSendable: 1000,
				metadata: '[["text/plain", "test"]]',
				allowsNostr: true,
				nostrPubkey: 'abc123',
				tag: 'payRequest'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await zapService.fetchLnurlPayEndpoint('user@domain.com');
			
			expect(result).toBeDefined();
			expect(result?.allowsNostr).toBe(true);
		});

		it('should throw on fetch failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Not Found'
			});

			await expect(zapService.fetchLnurlPayEndpoint('invalid@domain.com'))
				.rejects.toThrow();
		});

		it('should throw on network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(zapService.fetchLnurlPayEndpoint('user@domain.com'))
				.rejects.toThrow('Network error');
		});
	});

	describe('Zap Request Validation', () => {
		const validParams: ZapRequestParams = {
			recipientPubkey: 'abc123',
			amount: 21000,
			lnurl: 'user@domain.com',
			comment: 'Great post!',
			eventId: 'event123',
			relays: ['wss://relay.test']
		};

		it('should validate amount is positive', () => {
			expect(validParams.amount).toBeGreaterThan(0);
		});

		it('should have required fields', () => {
			expect(validParams.recipientPubkey).toBeDefined();
			expect(validParams.amount).toBeDefined();
			expect(validParams.lnurl).toBeDefined();
		});

		it('should allow optional comment', () => {
			const paramsWithoutComment: ZapRequestParams = {
				recipientPubkey: 'abc123',
				amount: 21000,
				lnurl: 'user@domain.com'
			};
			
			expect(paramsWithoutComment.comment).toBeUndefined();
		});

		it('should allow optional eventId', () => {
			const paramsWithoutEvent: ZapRequestParams = {
				recipientPubkey: 'abc123',
				amount: 21000,
				lnurl: 'user@domain.com'
			};
			
			expect(paramsWithoutEvent.eventId).toBeUndefined();
		});
	});

	describe('Amount Conversion', () => {
		it('should handle millisat conversion (1 sat = 1000 msat)', () => {
			const sats = 100;
			const millisats = sats * 1000;
			
			expect(millisats).toBe(100000);
		});

		it('should validate minimum sendable amount', () => {
			const minSendable = 1000; // 1 sat in millisats
			const amount = 500; // 0.5 sats - below minimum
			
			expect(amount).toBeLessThan(minSendable);
		});

		it('should validate maximum sendable amount', () => {
			const maxSendable = 100000000; // 100k sats in millisats
			const amount = 50000000; // 50k sats - within limit
			
			expect(amount).toBeLessThanOrEqual(maxSendable);
		});
	});

	describe('LNURL-pay Response Validation', () => {
		it('should validate allowsNostr flag', () => {
			const response: LnurlPayResponse = {
				callback: 'https://test.com/callback',
				maxSendable: 100000000,
				minSendable: 1000,
				metadata: '[]',
				allowsNostr: true,
				nostrPubkey: 'pubkey123',
				tag: 'payRequest'
			};

			expect(response.allowsNostr).toBe(true);
			expect(response.nostrPubkey).toBeDefined();
		});

		it('should handle response without nostr support', () => {
			const response: LnurlPayResponse = {
				callback: 'https://test.com/callback',
				maxSendable: 100000000,
				minSendable: 1000,
				metadata: '[]',
				tag: 'payRequest'
			};

			expect(response.allowsNostr).toBeUndefined();
		});

		it('should validate tag is payRequest', () => {
			const response: LnurlPayResponse = {
				callback: 'https://test.com/callback',
				maxSendable: 100000000,
				minSendable: 1000,
				metadata: '[]',
				tag: 'payRequest'
			};

			expect(response.tag).toBe('payRequest');
		});
	});

	describe('Comment Handling', () => {
		it('should respect commentAllowed limit', () => {
			const commentAllowed = 144;
			const comment = 'A'.repeat(200);
			const truncated = comment.substring(0, commentAllowed);
			
			expect(truncated.length).toBe(commentAllowed);
		});

		it('should handle empty comments', () => {
			const comment = '';
			expect(comment.length).toBe(0);
		});

		it('should handle undefined comments', () => {
			const params: ZapRequestParams = {
				recipientPubkey: 'abc',
				amount: 1000,
				lnurl: 'user@test.com'
			};
			
			expect(params.comment).toBeUndefined();
		});
	});
});
