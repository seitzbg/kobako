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
</script>

<li class="incense-cell">
	<a class="incense-card" href={resolve('/(app)/incense/[id]', { id: item.id })}>
		{#if item.imagePath}<img class="thumb" src={`/media/${item.imagePath}`} alt="" />{/if}
		<span class="name">{item.name}</span>
		{#if item.brand}<span class="brand muted">{item.brand}</span>{/if}
		<span class="meta">
			{#if item.format}<span class="badge badge-used">{formatLabel(item.format)}</span>{/if}
			{#if item.scentFamily}<span class="tag">{scentFamilyLabel(item.scentFamily)}</span>{/if}
			{#if item.myStatus}<span class="badge status-badge"
					>{collectionStatusLabel(item.myStatus)}</span
				>{/if}
		</span>
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
		<form method="POST" action="?/setStatus" use:enhance class="quick-set">
			<input type="hidden" name="incenseId" value={item.id} />
			<label class="visually-hidden" for={`qs-${item.id}`}>Collection status</label>
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
	}
	.incense-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 100%;
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
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.status-badge {
		color: var(--paper);
		background: var(--seal);
	}
	.score {
		margin-top: auto;
		font-size: 0.9rem;
		color: var(--star);
		font-weight: 600;
	}
	.quick-set {
		margin-top: 0.5rem;
	}
	.quick-set select {
		font-size: 0.8rem;
		padding: 0.35rem 0.5rem;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}
</style>
