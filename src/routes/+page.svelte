<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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

{#if data.items.length}
	<ul class="cards">
		{#each data.items as item (item.id)}
			<li>
				<a class="incense-card" href={resolve('/incense/[id]', { id: item.id })}>
					{#if item.imagePath}<img class="thumb" src={`/media/${item.imagePath}`} alt="" />{/if}
					<span class="name">{item.name}</span>
					{#if item.brand}<span class="brand muted">{item.brand}</span>{/if}
					<span class="meta">
						{#if item.format}<span class="badge badge-used">{formatLabel(item.format)}</span>{/if}
						{#if item.scentFamily}<span class="tag">{scentFamilyLabel(item.scentFamily)}</span>{/if}
					</span>
					<span class="score">
						{#if item.reviewCount === 0}
							<span class="muted">No reviews yet</span>
						{:else}
							{#if item.avgOverall !== null}★ {item.avgOverall} <span class="muted">·</span>
							{/if}
							<span class="muted">{item.reviewCount} review{item.reviewCount === 1 ? '' : 's'}</span
							>
						{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
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
	.incense-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		height: 100%;
		padding: 1.1rem 1.2rem;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: var(--ink);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.06s ease;
	}
	.incense-card:hover {
		border-color: var(--ink-faint);
		box-shadow: var(--shadow-md);
	}
	.thumb {
		width: 100%;
		height: 130px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		margin-bottom: 0.5rem;
	}
	.name {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		font-weight: 600;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.2rem;
	}
	.tag {
		font-size: 0.75rem;
		color: var(--ink-soft);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
	}
	.score {
		margin-top: auto;
		font-size: 0.9rem;
		color: var(--star);
		font-weight: 600;
	}
</style>
