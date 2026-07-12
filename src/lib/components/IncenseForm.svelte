<script lang="ts">
	import { FORMATS, SCENT_FAMILIES, formatLabel, scentFamilyLabel } from '$lib/incense';
	import type { Incense } from '$lib/server/db/schema';
	import type { ResolvedPathname } from '$app/types';

	let {
		item,
		tags = '',
		form,
		submitLabel,
		cancelHref
	}: {
		item?: Incense;
		tags?: string;
		form?: { error?: string } | null;
		submitLabel: string;
		cancelHref: ResolvedPathname;
	} = $props();
</script>

<form method="POST">
	{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}

	<div class="form-section">
		<p class="section-title">Identity</p>
		<div class="grid">
			<div class="field span-2">
				<label class="field-label" for="name">Name *</label>
				<input id="name" name="name" required maxlength="200" value={item?.name ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="brand">Brand / maker</label>
				<input id="brand" name="brand" value={item?.brand ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="origin">Origin</label>
				<input id="origin" name="origin" value={item?.origin ?? ''} />
			</div>
		</div>
	</div>

	<div class="form-section">
		<p class="section-title">Character</p>
		<div class="grid">
			<div class="field">
				<label class="field-label" for="format">Format</label>
				<select id="format" name="format">
					<option value="">—</option>
					{#each FORMATS as f (f)}
						<option value={f} selected={item?.format === f}>{formatLabel(f)}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="scentFamily">Scent family</label>
				<select id="scentFamily" name="scentFamily">
					<option value="">—</option>
					{#each SCENT_FAMILIES as s (s)}
						<option value={s} selected={item?.scentFamily === s}>{scentFamilyLabel(s)}</option>
					{/each}
				</select>
			</div>
			<div class="field span-2">
				<label class="field-label" for="ingredients">Ingredients</label>
				<textarea id="ingredients" name="ingredients" rows="2">{item?.ingredients ?? ''}</textarea>
			</div>
			<div class="field span-2">
				<label class="field-label" for="description">Description</label>
				<textarea id="description" name="description" rows="3">{item?.description ?? ''}</textarea>
			</div>
		</div>
	</div>

	<div class="form-section">
		<p class="section-title">Details</p>
		<div class="grid">
			<div class="field">
				<label class="field-label" for="length">Length</label>
				<input id="length" name="length" placeholder="e.g. 21 cm" value={item?.length ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="burnTime">Burn time</label>
				<input
					id="burnTime"
					name="burnTime"
					placeholder="e.g. 45 min"
					value={item?.burnTime ?? ''}
				/>
			</div>
			<div class="field">
				<label class="field-label" for="sticksPerBox">Sticks per box</label>
				<input
					id="sticksPerBox"
					name="sticksPerBox"
					inputmode="numeric"
					value={item?.sticksPerBox ?? ''}
				/>
			</div>
		</div>
	</div>

	<div class="form-section">
		<p class="section-title">Sourcing &amp; price</p>
		<div class="grid">
			<div class="field">
				<label class="field-label" for="sourceShop">Source shop</label>
				<input id="sourceShop" name="sourceShop" value={item?.sourceShop ?? ''} />
			</div>
			<div class="field">
				<label class="field-label" for="price">Price</label>
				<input
					id="price"
					name="price"
					inputmode="decimal"
					placeholder="e.g. 48.00"
					value={item?.price ?? ''}
				/>
			</div>
			<div class="field">
				<label class="field-label" for="currency">Currency</label>
				<input
					id="currency"
					name="currency"
					maxlength="8"
					placeholder="USD"
					value={item?.currency ?? ''}
				/>
			</div>
			<div class="field span-2">
				<label class="field-label" for="sourceUrl">Source URL</label>
				<input
					id="sourceUrl"
					name="sourceUrl"
					placeholder="https://…"
					value={item?.sourceUrl ?? ''}
				/>
			</div>
		</div>
	</div>

	<div class="form-section">
		<p class="section-title">Tags</p>
		<div class="grid">
			<div class="field span-2">
				<label class="field-label" for="tags">Tags</label>
				<input
					id="tags"
					name="tags"
					value={tags}
					placeholder="comma-separated, e.g. aloeswood, gift, daily"
				/>
			</div>
		</div>
	</div>

	<div class="actions">
		<button class="btn-primary" type="submit">{submitLabel}</button>
		<a class="btn" href={cancelHref}>Cancel</a>
	</div>
</form>

<style>
	.form-section + .form-section {
		margin-top: 1.75rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--line);
	}
	.section-title {
		margin: 0 0 1rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--seal);
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.1rem 1rem;
	}
	.span-2 {
		grid-column: 1 / -1;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.75rem;
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
