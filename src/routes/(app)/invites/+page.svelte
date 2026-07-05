<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state<string | null>(null);

	async function copy(token: string) {
		try {
			await navigator.clipboard.writeText(token);
			copied = token;
			setTimeout(() => {
				if (copied === token) copied = null;
			}, 1500);
		} catch {
			// clipboard unavailable (insecure context / permissions); no-op
		}
	}
</script>

<div class="page-head">
	<p class="kicker">Access</p>
	<h1>Invites</h1>
	<div class="rule"></div>
	<p style="margin-top:1rem">
		Each code lets one person create an account. Share them with family and friends.
	</p>
</div>

<form method="POST">
	<button class="btn-primary" type="submit">＋ Generate invite</button>
</form>

{#if form?.created}
	{@const token = form.created}
	<div class="callout">
		<p class="callout-label">New invite code — copy it before you leave this page</p>
		<div class="callout-code">
			<code>{token}</code>
			<button class="btn" type="button" onclick={() => copy(token)}>
				{copied === token ? '✓ Copied' : 'Copy'}
			</button>
		</div>
	</div>
{/if}

{#if data.invites.length}
	<ul class="list">
		{#each data.invites as inv (inv.id)}
			<li class="list-row">
				<span class="grow">
					<code>{inv.token}</code>
				</span>
				<span class="badge {inv.usedAt ? 'badge-used' : 'badge-unused'}">
					{inv.usedAt ? 'used' : 'unused'}
				</span>
				{#if !inv.usedAt}
					<button
						class="btn-quiet"
						type="button"
						onclick={() => copy(inv.token)}
						aria-label="Copy invite code"
					>
						{copied === inv.token ? '✓' : 'Copy'}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted" style="margin-top:1.5rem">
		No invites yet — generate one above to bring someone in.
	</p>
{/if}
