<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="topbar">
	<a class="brand" href={resolve('/')}>香 Kōbako</a>
	{#if data.user}
		<nav>
			<span>{data.user.username}</span>
			<form method="POST" action="/logout"><button>Sign out</button></form>
		</nav>
	{:else}
		<nav><a href={resolve('/login')}>Sign in</a></nav>
	{/if}
</header>

<main>{@render children()}</main>
