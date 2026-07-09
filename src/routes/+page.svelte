<script lang="ts">
	import { resolve } from '$app/paths';
	import { isFiltered } from '$lib/incense';
	import CatalogFilters from '$lib/components/CatalogFilters.svelte';
	import IncenseCard from '$lib/components/IncenseCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filtered = $derived(isFiltered(data.filters));
</script>

<div class="page-head head-row">
	<div>
		<p class="kicker">Your collection</p>
		<h1>The catalog</h1>
		<div class="rule"></div>
	</div>
	<div class="head-actions">
		<a class="btn" href={resolve('/incense/import')}>Import from URL</a>
		<a class="btn-primary" href={resolve('/incense/new')}>＋ Add incense</a>
	</div>
</div>

<CatalogFilters filters={data.filters} count={data.items.length} />

{#if data.items.length}
	<ul class="cards">
		{#each data.items as item (item.id)}
			<IncenseCard {item} quickSet />
		{/each}
	</ul>
{:else if filtered}
	<div class="empty">
		<div class="mark">香</div>
		<h2 style="font-size:1.2rem;margin:0">No incense matches these filters</h2>
		<p>Try removing a filter or clearing your search.</p>
		<p style="margin-top:1.25rem">
			<a class="btn" href={resolve('/')}>Clear filters</a>
		</p>
	</div>
{:else}
	<div class="empty">
		<div class="mark">香</div>
		<h2 style="font-size:1.2rem;margin:0">Your catalog is empty</h2>
		<p>Add your first incense to begin — then rate it and write a review.</p>
		<p style="margin-top:1.25rem">
			<a class="btn-primary" href={resolve('/incense/new')}>＋ Add incense</a>
		</p>
	</div>
{/if}

<style>
	.head-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.head-actions {
		display: flex;
		gap: 0.5rem;
	}
	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}
</style>
