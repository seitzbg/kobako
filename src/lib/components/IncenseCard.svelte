<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import {
		formatLabel,
		scentFamilyLabel,
		collectionStatusLabel,
		COLLECTION_STATUSES
	} from '$lib/incense';
	import type { IncenseSummary } from '$lib/incense';

	let { item, quickSet = false }: { item: IncenseSummary; quickSet?: boolean } = $props();

	// Quiet factual line: "Stick · Aloeswood / kyara" (omit whichever is missing).
	const facts = $derived(
		[
			item.format && formatLabel(item.format),
			item.scentFamily && scentFamilyLabel(item.scentFamily)
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<li class="incense-cell">
	<a class="incense-card" href={resolve('/(app)/incense/[id]', { id: item.id })}>
		{#if item.imagePath}<img class="thumb" src={`/media/${item.imagePath}`} alt="" />{/if}
		<span class="name">{item.name}</span>
		{#if item.brand}<span class="brand muted">{item.brand}</span>{/if}
		{#if facts}<span class="facts muted">{facts}</span>{/if}
		{#if item.tags.length}
			<span class="tags">
				{#each item.tags as t (t)}<span class="tag">{t}</span>{/each}
			</span>
		{/if}
		<span class="score">
			{#if item.reviewCount === 0}
				<span class="muted">No reviews yet</span>
			{:else}
				{#if item.avgOverall !== null}★ {item.avgOverall} <span class="muted">·</span>
				{/if}
				<span class="muted">{item.reviewCount} review{item.reviewCount === 1 ? '' : 's'}</span>
			{/if}
		</span>
	</a>
	{#if quickSet}
		<form method="POST" action="?/setStatus" use:enhance class="card-footer">
			<input type="hidden" name="incenseId" value={item.id} />
			<label class="footer-label" for={`qs-${item.id}`}>Collection</label>
			<select
				id={`qs-${item.id}`}
				name="status"
				value={item.myStatus ?? ''}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				<option value="">— not in collection</option>
				{#each COLLECTION_STATUSES as s (s)}<option value={s}>{collectionStatusLabel(s)}</option
					>{/each}
			</select>
		</form>
	{/if}
</li>

<style>
	.incense-cell {
		display: flex;
		flex-direction: column;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.incense-cell:hover {
		border-color: var(--ink-faint);
		box-shadow: var(--shadow-md);
	}
	.incense-card {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1.1rem 1.2rem;
		text-decoration: none;
		color: var(--ink);
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
	.facts {
		font-size: 0.85rem;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.1rem;
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
		padding-top: 0.35rem;
		font-size: 0.9rem;
		color: var(--star);
		font-weight: 600;
	}
	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1.2rem;
		border-top: 1px solid var(--line);
		background: var(--paper-sunk);
	}
	.footer-label {
		font-size: 0.78rem;
		color: var(--ink-soft);
		white-space: nowrap;
	}
	.card-footer select {
		flex: 1;
		padding: 0.45rem 0.6rem;
		font-size: 0.85rem;
	}
</style>
