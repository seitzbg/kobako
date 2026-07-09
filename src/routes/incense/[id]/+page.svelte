<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import {
		SCORE_AXES,
		COLLECTION_STATUSES,
		formatLabel,
		scentFamilyLabel,
		collectionStatusLabel
	} from '$lib/incense';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const byStatus = $derived(
		COLLECTION_STATUSES.map((s) => ({
			status: s,
			users: data.collection.filter((c) => c.status === s).map((c) => c.username)
		})).filter((g) => g.users.length)
	);

	const facts = $derived(
		[
			['Brand / maker', data.item.brand],
			['Format', data.item.format ? formatLabel(data.item.format) : null],
			['Scent family', data.item.scentFamily ? scentFamilyLabel(data.item.scentFamily) : null],
			['Origin', data.item.origin],
			['Ingredients', data.item.ingredients],
			['Length', data.item.length],
			['Burn time', data.item.burnTime],
			['Sticks / box', data.item.sticksPerBox?.toString() ?? null],
			[
				'Price',
				data.item.price
					? `${data.item.price}${data.item.currency ? ' ' + data.item.currency : ''}`
					: null
			],
			['Source', data.item.sourceShop]
		].filter(([, v]) => v)
	);
</script>

<div class="page-head head-row">
	<div>
		<p class="kicker">Incense</p>
		<h1>{data.item.name}</h1>
		<div class="rule"></div>
	</div>
	<div class="head-actions">
		<a class="btn" href={resolve('/incense/[id]/edit', { id: data.item.id })}>Edit</a>
		<a class="btn-quiet" href={resolve('/')}>← Catalog</a>
	</div>
</div>

{#if data.item.imagePath}
	<img class="hero" src={`/media/${data.item.imagePath}`} alt={data.item.name} />
{/if}
{#if facts.length}
	<dl class="facts card">
		{#each facts as [label, value] (label)}
			<div>
				<dt>{label}</dt>
				<dd>{value}</dd>
			</div>
		{/each}
	</dl>
{/if}
{#if data.item.description}
	<p class="description">{data.item.description}</p>
{/if}
{#if data.item.sourceUrl}
	<p class="muted">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external absolute URL (source shop), not a SvelteKit internal route -->
		<a href={data.item.sourceUrl} target="_blank" rel="noreferrer noopener nofollow"
			>View at source shop ↗</a
		>
	</p>
{/if}

<section class="collection card">
	<h2>Your collection</h2>
	<form method="POST" action="?/status" use:enhance class="status-control">
		{#each COLLECTION_STATUSES as s (s)}
			<button
				class="status-btn"
				class:on={data.myStatus === s}
				type="submit"
				name="status"
				value={s}
				aria-pressed={data.myStatus === s}>{collectionStatusLabel(s)}</button
			>
		{/each}
		{#if data.myStatus}
			<button class="status-btn remove" type="submit" name="status" value="">Remove</button>
		{/if}
	</form>
	{#if form?.statusSaved}<p class="muted saved-note">Saved.</p>{/if}

	{#if byStatus.length}
		<dl class="in-collections">
			{#each byStatus as g (g.status)}
				<div>
					<dt>{collectionStatusLabel(g.status)}</dt>
					<dd>{g.users.join(', ')}</dd>
				</div>
			{/each}
		</dl>
	{:else}
		<p class="muted">No one has added this to a collection yet.</p>
	{/if}
</section>

<h2 style="margin-top:2rem">Everyone's ratings</h2>
{#if data.reviews.length}
	<div class="reviews">
		{#each data.reviews as r (r.id)}
			<article class="card review">
				<header class="review-head">
					<strong>{r.username}</strong>
					{#if r.overall !== null}<span class="score">★ {r.overall}/5</span>{/if}
				</header>
				<ul class="axes">
					{#each SCORE_AXES as axis (axis.key)}
						{#if r[axis.key] !== null}
							<li><span class="muted">{axis.label}</span> <b>{r[axis.key]}</b></li>
						{/if}
					{/each}
				</ul>
				{#if r.reviewText}<p class="text">{r.reviewText}</p>{/if}
			</article>
		{/each}
	</div>
{:else}
	<p class="muted">No reviews yet — be the first below.</p>
{/if}

<h2 style="margin-top:2rem">Your review</h2>
<form method="POST" action="?/review" use:enhance class="card review-form">
	{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}
	{#if form?.saved}<p class="alert saved">Saved.</p>{/if}
	<div class="sliders">
		{#each SCORE_AXES as axis (axis.key)}
			<label class="slider">
				<span class="field-label">{axis.label}</span>
				<select name={axis.key}>
					<option value="">—</option>
					{#each [0, 1, 2, 3, 4, 5] as n (n)}
						<option value={n} selected={data.myReview?.[axis.key] === n}>{n}</option>
					{/each}
				</select>
			</label>
		{/each}
	</div>
	<div class="field">
		<label class="field-label" for="reviewText">Notes</label>
		<textarea
			id="reviewText"
			name="reviewText"
			rows="4"
			placeholder="How did it smell, burn, evolve?">{data.myReview?.reviewText ?? ''}</textarea
		>
	</div>
	<button class="btn-primary" type="submit"
		>{data.myReview ? 'Update review' : 'Save review'}</button
	>
</form>

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
		flex: none;
	}
	.hero {
		max-width: 260px;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		margin-bottom: 1.5rem;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.9rem 1.5rem;
		margin: 0;
	}
	.facts dt {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-soft);
	}
	.facts dd {
		margin: 0.15rem 0 0;
	}
	.description {
		white-space: pre-wrap;
		color: var(--ink-soft);
		max-width: 68ch;
	}
	.reviews {
		display: grid;
		gap: 1rem;
	}
	.review-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.review-head .score {
		color: var(--star);
		font-weight: 600;
	}
	.axes {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.1rem;
		padding: 0;
		margin: 0.6rem 0 0;
		font-size: 0.9rem;
	}
	.text {
		margin: 0.75rem 0 0;
		white-space: pre-wrap;
	}
	.review-form {
		margin-top: 0.5rem;
	}
	.sliders {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.slider {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.alert.saved {
		color: var(--ok);
		background: color-mix(in srgb, var(--ok) 14%, transparent);
		border-color: color-mix(in srgb, var(--ok) 40%, transparent);
	}
	.collection {
		margin-top: 2rem;
	}
	.collection h2 {
		margin: 0 0 0.75rem;
	}
	.status-control {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.status-btn {
		font: inherit;
		font-size: 0.85rem;
		width: auto;
		cursor: pointer;
		padding: 0.3rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--paper-raised);
		color: var(--ink-soft);
	}
	.status-btn.on {
		color: var(--paper);
		background: var(--seal);
		border-color: var(--seal);
	}
	.status-btn.remove {
		color: var(--ink-faint);
	}
	.saved-note {
		margin: 0.5rem 0 0;
	}
	.in-collections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.6rem 1.5rem;
		margin: 1.1rem 0 0;
	}
	.in-collections dt {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-soft);
	}
	.in-collections dd {
		margin: 0.15rem 0 0;
	}
</style>
