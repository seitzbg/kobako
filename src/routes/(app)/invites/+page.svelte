<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h1>Invites</h1>
<form method="POST"><button>Generate invite</button></form>
{#if form?.created}<p>New invite code: <code>{form.created}</code></p>{/if}

<ul>
	{#each data.invites as inv (inv.id)}
		<li><code>{inv.token}</code> — {inv.usedAt ? 'used' : 'unused'}</li>
	{/each}
</ul>
