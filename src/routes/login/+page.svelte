<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Sign in to Kōbako</h1>
{#if form?.error}<p class="error">{form.error}</p>{/if}
<form method="POST">
	<label>Username <input name="username" required /></label>
	<label>Password <input name="password" type="password" required /></label>
	<button type="submit">Sign in</button>
</form>
