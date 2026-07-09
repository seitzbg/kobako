<script lang="ts">
	import { resolve } from '$app/paths';
	import { collectionStatusLabel } from '$lib/incense';
	import IncenseCard from '$lib/components/IncenseCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let total = $derived(data.groups.reduce((n, g) => n + g.items.length, 0));
</script>

<div class="page-head">
	<p class="kicker">Yours</p>
	<h1>My collection</h1>
	<div class="rule"></div>
</div>

{#if total}
	{#each data.groups as group (group.status)}
		{#if group.items.length}
			<section class="group">
				<h2>
					{collectionStatusLabel(group.status)} <span class="muted">· {group.items.length}</span>
				</h2>
				<ul class="cards">
					{#each group.items as item (item.id)}
						<IncenseCard {item} quickSet />
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
{:else}
	<div class="empty">
		<div class="mark">香</div>
		<h2 style="font-size:1.2rem;margin:0">Your collection is empty</h2>
		<p>Mark items as owned, wishlist, sample, or used-up from the catalog.</p>
		<p style="margin-top:1.25rem">
			<a class="btn-primary" href={resolve('/')}>Browse the catalog</a>
		</p>
	</div>
{/if}

<style>
	.group {
		margin-bottom: 2rem;
	}
	.group h2 {
		margin: 0 0 0.9rem;
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
