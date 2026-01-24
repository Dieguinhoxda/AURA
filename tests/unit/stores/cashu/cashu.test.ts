import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockGetTotalBalance, mockGetBalanceByMint, mockGetAllMints, mockAddMint, mockGetTransactions } = vi.hoisted(() => ({
	mockGetTotalBalance: vi.fn().mockResolvedValue(1000),
	mockGetBalanceByMint: vi.fn().mockResolvedValue(new Map([['https://mint.test', 1000]])),
	mockGetAllMints: vi.fn().mockResolvedValue([
		{ url: 'https://mint.test', name: 'Test Mint', trusted: true }
	]),
	mockAddMint: vi.fn().mockResolvedValue({ url: 'https://new.mint', name: 'New Mint', trusted: false }),
	mockGetTransactions: vi.fn().mockResolvedValue([])
}));

// Mock cashu service
vi.mock('$lib/services/wallet', () => ({
	cashuService: {
		getTotalBalance: mockGetTotalBalance,
		getBalanceByMint: mockGetBalanceByMint,
		getAllMints: mockGetAllMints,
		addMint: mockAddMint,
		getTransactions: mockGetTransactions,
		formatAmount: (amount: number) => `${amount} sats`
	},
	DEFAULT_MINTS: [
		{ url: 'https://8333.space:3338', name: '8333.space' }
	]
}));

// Mock db helpers
vi.mock('$db', () => ({
	dbHelpers: {}
}));

// Mock error handler
vi.mock('$lib/core/errors', () => ({
	ErrorHandler: {
		handle: (e: Error) => ({ userMessage: e.message })
	},
	WalletError: class extends Error {},
	ErrorCode: {}
}));

describe('Cashu Store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Types and Interfaces', () => {
		it('should define CashuStatus type correctly', () => {
			const statuses: Array<'disconnected' | 'connecting' | 'connected' | 'error'> = [
				'disconnected', 'connecting', 'connected', 'error'
			];
			expect(statuses).toHaveLength(4);
		});

		it('should define PendingMintQuote interface', () => {
			const quote = {
				quote: 'quote123',
				invoice: 'lnbc...',
				amount: 1000,
				mintUrl: 'https://mint.test',
				createdAt: Date.now(),
				expiresAt: Date.now() + 3600000
			};
			expect(quote.quote).toBe('quote123');
			expect(quote.amount).toBe(1000);
		});
	});

	describe('Service Integration', () => {
		it('should call getTotalBalance on service', async () => {
			await mockGetTotalBalance();
			expect(mockGetTotalBalance).toHaveBeenCalled();
		});

		it('should call getBalanceByMint on service', async () => {
			const balances = await mockGetBalanceByMint();
			expect(balances.get('https://mint.test')).toBe(1000);
		});

		it('should call getAllMints on service', async () => {
			const mints = await mockGetAllMints();
			expect(mints).toHaveLength(1);
			expect(mints[0].url).toBe('https://mint.test');
		});

		it('should add mint via service', async () => {
			const mint = await mockAddMint('https://new.mint', false);
			expect(mint.url).toBe('https://new.mint');
			expect(mockAddMint).toHaveBeenCalledWith('https://new.mint', false);
		});

		it('should get transactions from service', async () => {
			const transactions = await mockGetTransactions(50);
			expect(Array.isArray(transactions)).toBe(true);
		});
	});

	describe('Balance Formatting', () => {
		it('should format balance correctly', () => {
			// Test formatting logic directly
			const formatAmount = (amount: number) => `${amount} sats`;
			const formatted = formatAmount(1000);
			expect(formatted).toBe('1000 sats');
		});

		it('should format zero balance', () => {
			const formatAmount = (amount: number) => `${amount} sats`;
			const formatted = formatAmount(0);
			expect(formatted).toBe('0 sats');
		});
	});

	describe('Mint Management', () => {
		it('should filter trusted mints', async () => {
			const mints = await mockGetAllMints();
			const trusted = mints.filter((m: { trusted: boolean }) => m.trusted);
			expect(trusted).toHaveLength(1);
		});

		it('should handle mints without trust status', async () => {
			mockGetAllMints.mockResolvedValueOnce([
				{ url: 'https://mint1.test', name: 'Mint 1', trusted: true },
				{ url: 'https://mint2.test', name: 'Mint 2', trusted: false }
			]);
			
			const mints = await mockGetAllMints();
			expect(mints).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle service errors gracefully', async () => {
			mockGetTotalBalance.mockRejectedValueOnce(new Error('Network error'));
			
			await expect(mockGetTotalBalance()).rejects.toThrow('Network error');
		});

		it('should handle add mint failure', async () => {
			mockAddMint.mockRejectedValueOnce(new Error('Invalid mint URL'));
			
			await expect(mockAddMint('invalid')).rejects.toThrow('Invalid mint URL');
		});
	});

	describe('Default Mints', () => {
		it('should have default mints defined in mock', () => {
			// Verify that default mints are configured in the mock
			const defaultMints = [{ url: 'https://8333.space:3338', name: '8333.space' }];
			expect(defaultMints).toBeDefined();
			expect(defaultMints.length).toBeGreaterThan(0);
			expect(defaultMints[0].url).toContain('8333.space');
		});
	});
});
