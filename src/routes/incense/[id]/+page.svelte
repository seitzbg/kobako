<script lang="ts">
	import { resolve } from '$app/paths';
	import { SCORE_AXES, formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- /incense/[id]/edit route lands in Task 6; can't type-check via resolve() until that route exists -->
		<a class="btn" href={`/incense/${data.item.id}/edit`}>Edit</a>
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
</style>
