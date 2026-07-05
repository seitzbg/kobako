<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="auth">
	<div class="card">
		<p class="kicker">香 Kōbako</p>
		<h1>Join the collection</h1>
		<p class="sub">Redeem your invite to create an account.</p>

		{#if form?.error}<p class="alert alert-error">{form.error}</p>{/if}

		<form method="POST">
			<div class="field">
				<label class="field-label" for="invite">Invite code</label>
				<input id="invite" name="invite" autocomplete="off" spellcheck="false" required />
			</div>
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
					autocomplete="new-password"
					required
				/>
			</div>
			<button class="btn-primary btn-block" type="submit">Create account</button>
		</form>
	</div>
	<p class="alt">
		Already have an account? <a href={resolve('/login')}>Sign in</a>
	</p>
</div>
