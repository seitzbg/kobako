<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		FORMATS,
		SCENT_FAMILIES,
		CATALOG_SORTS,
		isFiltered,
		formatLabel,
		scentFamilyLabel
	} from '$lib/incense';
	import type { CatalogFilters } from '$lib/incense';

	let { filters, count }: { filters: CatalogFilters; count: number } = $props();

	// Progressive enhancement: with JS, changing any control resubmits the GET
	// form (SvelteKit intercepts it as a client-side navigation). Without JS, the
	// Apply button submits normally.
	function autoSubmit(e: Event) {
		(e.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
	}

	let showClear = $derived(isFiltered(filters) || filters.sort !== 'newest');
</script>

<form class="filters" method="GET" action={resolve('/')} role="search">
	<div class="search-row">
		<input
			type="search"
			name="q"
			value={filters.q}
			placeholder="Search name, brand, origin, notes…"
			aria-label="Search catalog"
			onchange={autoSubmit}
		/>
		<button class="btn-primary" type="submit">Apply</button>
	</div>

	<fieldset class="facet">
		<legend>Format</legend>
		{#each FORMATS as f (f)}
			<label class="chip" class:on={filters.formats.includes(f)}>
				<input
					type="checkbox"
					name="format"
					value={f}
					checked={filters.formats.includes(f)}
					onchange={autoSubmit}
				/>
				{formatLabel(f)}
			</label>
		{/each}
	</fieldset>

	<fieldset class="facet">
		<legend>Scent</legend>
		{#each SCENT_FAMILIES as s (s)}
			<label class="chip" class:on={filters.scents.includes(s)}>
				<input
					type="checkbox"
					name="scent"
					value={s}
					checked={filters.scents.includes(s)}
					onchange={autoSubmit}
				/>
				{scentFamilyLabel(s)}
			</label>
		{/each}
	</fieldset>

	<div class="controls">
		<label class="sortby">
			<span class="field-label">Sort</span>
			<select name="sort" value={filters.sort} onchange={autoSubmit}>
				{#each CATALOG_SORTS as opt (opt.key)}<option value={opt.key}>{opt.label}</option>{/each}
			</select>
		</label>
		<span class="count muted">{count} result{count === 1 ? '' : 's'}</span>
		{#if showClear}<a class="btn-quiet" href={resolve('/')}>Clear</a>{/if}
	</div>
</form>

<style>
	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		margin: 0 0 1.6rem;
		padding: 1rem 1.1rem;
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: var(--radius);
	}
	.search-row {
		display: flex;
		gap: 0.5rem;
	}
	.search-row input {
		flex: 1;
	}
	.search-row .btn-primary {
		flex: none;
	}
	.facet {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		border: 0;
	}
	.facet legend {
		float: left;
		width: 4.5rem;
		padding: 0.2rem 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink-soft);
	}
	.chip {
		font-size: 0.8rem;
		color: var(--ink-soft);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.2rem 0.7rem;
		cursor: pointer;
		user-select: none;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease;
	}
	.chip:hover {
		border-color: var(--ink-faint);
	}
	.chip.on {
		color: var(--paper);
		background: var(--seal);
		border-color: var(--seal);
	}
	/* Visually hide the native checkbox; the label is the chip. */
	.chip input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}
	.chip:focus-within {
		outline: none;
		border-color: var(--seal);
		box-shadow: 0 0 0 3px var(--focus);
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		flex-wrap: wrap;
	}
	.sortby {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.sortby .field-label {
		margin: 0;
	}
	.sortby select {
		width: auto;
	}
	.count {
		font-size: 0.85rem;
	}
	.controls .btn-quiet {
		margin-left: auto;
	}
</style>
