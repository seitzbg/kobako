<script lang="ts">
	import { resolve } from '$app/paths';
	import IncenseForm from '$lib/components/IncenseForm.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const it = $derived(data.item);
</script>

<div class="page-head">
	<p class="kicker">Catalog</p>
	<h1>Edit incense</h1>
	<div class="rule"></div>
</div>

<div class="card">
	<IncenseForm
		item={it}
		tags={data.tags.join(', ')}
		{form}
		submitLabel="Save changes"
		cancelHref={resolve('/(app)/incense/[id]', { id: it.id })}
	/>
</div>
