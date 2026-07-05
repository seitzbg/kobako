<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Join Kōbako</h1>
{#if form?.error}<p class="error">{form.error}</p>{/if}
<form method="POST">
	<label>Invite code <input name="invite" required /></label>
	<label>Username <input name="username" required /></label>
	<label>Password <input name="password" type="password" required /></label>
	<button type="submit">Create account</button>
</form>
