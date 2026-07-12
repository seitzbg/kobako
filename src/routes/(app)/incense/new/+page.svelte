<script lang="ts">
	import { resolve } from '$app/paths';
	import IncenseForm from '$lib/components/IncenseForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="page-head">
	<p class="kicker">Catalog</p>
	<h1>Add incense</h1>
	<div class="rule"></div>
</div>

<div class="card">
	<IncenseForm {form} submitLabel="Add to catalog" cancelHref={resolve('/')} />
</div>
