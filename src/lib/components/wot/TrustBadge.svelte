<script lang="ts">
	/**
	 * TrustBadge
	 * 
	 * Displays trust level indicator for a user.
	 */
	import { wotStore } from '$stores/wot.svelte';
	import type { TrustLevel } from '$lib/services/wot';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import Shield from 'lucide-svelte/icons/shield';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';
	import ShieldQuestion from 'lucide-svelte/icons/shield-question';
	import Ban from 'lucide-svelte/icons/ban';
	import User from 'lucide-svelte/icons/user';

	interface Props {
		pubkey: string;
		showLabel?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { pubkey, showLabel = false, size = 'sm' }: Props = $props();

	const indicator = $derived(wotStore.getTrustIndicator(pubkey));

	const sizeClasses = {
		sm: 'h-3 w-3',
		md: 'h-4 w-4',
		lg: 'h-5 w-5'
	};

	const iconSize = $derived(sizeClasses[size]);
</script>

<span 
	class="inline-flex items-center gap-1 {indicator.color}"
	title="{indicator.label} (Score: {indicator.score})"
>
	{#if indicator.level === 'self'}
		<User class={iconSize} />
	{:else if indicator.level === 'trusted'}
		<ShieldCheck class={iconSize} />
	{:else if indicator.level === 'friend-of-friend'}
		<Shield class={iconSize} />
	{:else if indicator.level === 'extended'}
		<ShieldQuestion class={iconSize} />
	{:else if indicator.level === 'muted'}
		<Ban class={iconSize} />
	{:else}
		<ShieldAlert class={iconSize} />
	{/if}
	
	{#if showLabel}
		<span class="text-xs">{indicator.label}</span>
	{/if}
</span>
