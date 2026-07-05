<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { SCORE_AXES, formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
{#if data.item.sourceUrl}
	<p class="muted">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external absolute URL (source shop), not a SvelteKit internal route -->
		<a href={data.item.sourceUrl} target="_blank" rel="noreferrer noopener nofollow"
			>View at source shop ↗</a
		>
	</p>
{/if}

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
</style>
