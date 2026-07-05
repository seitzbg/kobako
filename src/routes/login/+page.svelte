<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="auth">
	<div class="card">
		<p class="kicker">香 Kōbako</p>
		<h1>Welcome back</h1>
		<p class="sub">Sign in to your collection.</p>

		{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}

		<form method="POST">
			<div class="field">
				<label class="field-label" for="username">Username</label>
				<input id="username" name="username" autocomplete="username" required />
			</div>
			<div class="field">
				<label class="field-label" for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
				/>
			</div>
			<button class="btn-primary btn-block" type="submit">Sign in</button>
		</form>
	</div>
	<p class="alt">
		Have an invite? <a href={resolve('/register')}>Create an account</a>
	</p>
</div>
