<script lang="ts">
	/**
	 * TrustFilter
	 * 
	 * Filter dropdown for Web of Trust levels.
	 */
	import { wotStore, type WoTFilterLevel } from '$stores/wot.svelte';
	import { Button } from '$components/ui/button';
	import Filter from 'lucide-svelte/icons/filter';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Check from 'lucide-svelte/icons/check';

	let showDropdown = $state(false);

	const filters: { value: WoTFilterLevel; label: string; description: string }[] = [
		{ value: 'all', label: 'All', description: 'Show everyone' },
		{ value: 'extended', label: 'Network', description: 'Extended network only' },
		{ value: 'fof', label: 'Friends', description: 'Friends & their friends' },
		{ value: 'trusted', label: 'Trusted', description: 'Direct follows only' }
	];

	function selectFilter(level: WoTFilterLevel) {
		wotStore.setFilterLevel(level);
		showDropdown = false;
	}
</script>

<div class="relative">
	<Button
		variant="ghost"
		size="sm"
		class="gap-1"
		onclick={() => showDropdown = !showDropdown}
	>
		<Filter class="h-4 w-4" />
		<span class="hidden sm:inline">
			{filters.find(f => f.value === wotStore.filterLevel)?.label || 'Filter'}
		</span>
		<ChevronDown class="h-3 w-3" />
	</Button>

	{#if showDropdown}
		<!-- Backdrop -->
		<button
			class="fixed inset-0 z-40"
			onclick={() => showDropdown = false}
			aria-label="Close filter dropdown"
		></button>

		<!-- Dropdown -->
		<div class="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg">
			{#each filters as filter}
				<button
					class="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted transition-colors
						{wotStore.filterLevel === filter.value ? 'bg-muted' : ''}"
					onclick={() => selectFilter(filter.value)}
				>
					<span class="w-4">
						{#if wotStore.filterLevel === filter.value}
							<Check class="h-4 w-4 text-primary" />
						{/if}
					</span>
					<div class="text-left">
						<div class="font-medium">{filter.label}</div>
						<div class="text-xs text-muted-foreground">{filter.description}</div>
					</div>
				</button>
			{/each}

			<div class="border-t border-border mt-1 pt-1">
				<button
					class="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
					onclick={() => { wotStore.toggleShowUnknown(); showDropdown = false; }}
				>
					<span class="w-4">
						{#if wotStore.showUnknown}
							<Check class="h-4 w-4 text-primary" />
						{/if}
					</span>
					<span>Show unknown users</span>
				</button>
			</div>
		</div>
	{/if}
</div>
