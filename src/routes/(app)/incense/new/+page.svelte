<script lang="ts">
	import { resolve } from '$app/paths';
	import { FORMATS, SCENT_FAMILIES, formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="page-head">
	<p class="kicker">Catalog</p>
	<h1>Add incense</h1>
	<div class="rule"></div>
</div>

<div class="card">
	{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}
	<form method="POST" class="grid">
		<div class="field span-2">
			<label class="field-label" for="name">Name *</label>
			<input id="name" name="name" required maxlength="200" />
		</div>
		<div class="field">
			<label class="field-label" for="brand">Brand / maker</label>
			<input id="brand" name="brand" />
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
			<label class="field-label" for="origin">Origin</label>
			<input id="origin" name="origin" />
		</div>
		<div class="field span-2">
			<label class="field-label" for="ingredients">Ingredients</label>
			<textarea id="ingredients" name="ingredients" rows="2"></textarea>
		</div>
		<div class="field span-2">
			<label class="field-label" for="description">Description</label>
			<textarea id="description" name="description" rows="3"></textarea>
		</div>
		<div class="field">
			<label class="field-label" for="length">Length</label>
			<input id="length" name="length" placeholder="e.g. 21 cm" />
		</div>
		<div class="field">
			<label class="field-label" for="burnTime">Burn time</label>
			<input id="burnTime" name="burnTime" placeholder="e.g. 45 min" />
		</div>
		<div class="field">
			<label class="field-label" for="sticksPerBox">Sticks per box</label>
			<input id="sticksPerBox" name="sticksPerBox" inputmode="numeric" />
		</div>
		<div class="field">
			<label class="field-label" for="sourceShop">Source shop</label>
			<input id="sourceShop" name="sourceShop" />
		</div>
		<div class="field">
			<label class="field-label" for="price">Price</label>
			<input id="price" name="price" inputmode="decimal" placeholder="e.g. 48.00" />
		</div>
		<div class="field">
			<label class="field-label" for="currency">Currency</label>
			<input id="currency" name="currency" maxlength="8" placeholder="USD" />
		</div>
		<div class="field span-2">
			<label class="field-label" for="sourceUrl">Source URL</label>
			<input id="sourceUrl" name="sourceUrl" placeholder="https://…" />
		</div>
		<div class="field span-2">
			<label class="field-label" for="tags">Tags</label>
			<input id="tags" name="tags" placeholder="comma-separated, e.g. aloeswood, gift, daily" />
		</div>
		<div class="actions span-2">
			<button class="btn-primary" type="submit">Add to catalog</button>
			<a class="btn" href={resolve('/')}>Cancel</a>
		</div>
	</form>
</div>

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
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
