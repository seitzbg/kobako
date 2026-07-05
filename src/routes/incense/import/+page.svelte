<script lang="ts">
	import { resolve } from '$app/paths';
	import { FORMATS, SCENT_FAMILIES, formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const p = $derived(form && 'prefill' in form ? form.prefill : null);
</script>

<div class="page-head">
	<p class="kicker">Catalog</p>
	<h1>Import from a URL</h1>
	<div class="rule"></div>
	<p style="margin-top:1rem">Paste a product link from a shop; we'll fill in what we can.</p>
</div>

{#if !p}
	<div class="card">
		{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}
		<form method="POST" action="?/fetch">
			<div class="field">
				<label class="field-label" for="url">Product URL</label>
				<input id="url" name="url" inputmode="url" placeholder="https://…" required />
			</div>
			<button class="btn-primary" type="submit">Fetch details</button>
			<a class="btn" href={resolve('/incense/new')} style="margin-left:.5rem"
				>Enter manually instead</a
			>
		</form>
	</div>
{:else}
	<div class="card">
		{#if form && 'existing' in form && form.existing}
			<p class="alert alert-error">
				Heads up: an item with this source URL is already in the catalog —
				<a href={resolve('/incense/[id]', { id: form.existing.id })}>view it</a>. Saving will add a
				second entry.
			</p>
		{/if}
		{#if form && 'imagePath' in form && form.imagePath}
			<img class="preview" src={`/media/${form.imagePath}`} alt="" />
		{/if}
		<form method="POST" action="?/save" class="grid">
			<input
				type="hidden"
				name="imagePath"
				value={form && 'imagePath' in form ? (form.imagePath ?? '') : ''}
			/>
			<div class="field span-2">
				<label class="field-label" for="name">Name *</label>
				<input id="name" name="name" required maxlength="200" value={p.name ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="brand">Brand / maker</label>
				<input id="brand" name="brand" value={p.brand ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="format">Format</label>
				<select id="format" name="format">
					<option value="">—</option>
					{#each FORMATS as f (f)}<option value={f}>{formatLabel(f)}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="scentFamily">Scent family</label>
				<select id="scentFamily" name="scentFamily">
					<option value="">—</option>
					{#each SCENT_FAMILIES as s (s)}<option value={s}>{scentFamilyLabel(s)}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="price">Price</label>
				<input id="price" name="price" inputmode="decimal" value={p.price ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="currency">Currency</label>
				<input id="currency" name="currency" maxlength="8" value={p.currency ?? ''} />
			</div>
			<div class="field span-2">
				<label class="field-label" for="description">Description</label>
				<textarea id="description" name="description" rows="4">{p.description ?? ''}</textarea>
			</div>
			<div class="field span-2">
				<label class="field-label" for="sourceShop">Source shop</label>
				<input id="sourceShop" name="sourceShop" value={p.sourceShop ?? ''} />
			</div>
			<div class="field span-2">
				<label class="field-label" for="sourceUrl">Source URL</label>
				<input id="sourceUrl" name="sourceUrl" value={p.sourceUrl ?? ''} />
			</div>
			{#if form?.error}<p class="alert alert-error span-2">{form.error}</p>{/if}
			<div class="actions span-2">
				<button class="btn-primary" type="submit">Add to catalog</button>
				<a class="btn" href={resolve('/')}>Cancel</a>
			</div>
		</form>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 1rem;
	}
	.span-2 {
		grid-column: 1 / -1;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.preview {
		max-width: 200px;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		margin-bottom: 1rem;
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
