<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let dark = $state(false);

	onMount(() => {
		const forced = document.documentElement.getAttribute('data-theme');
		dark = forced
			? forced === 'dark'
			: window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggleTheme() {
		dark = !dark;
		const next = dark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', next);
		try {
			localStorage.setItem('kobako-theme', next);
		} catch {
			// storage may be unavailable (private mode); theme still applies this session
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="topbar">
	<a class="brand" href={resolve('/')}>
		<span class="brand-mark" aria-hidden="true">香</span>
		Kōbako
	</a>
	<nav>
		<button
			class="icon-btn"
			type="button"
			onclick={toggleTheme}
			aria-label="Toggle light or dark theme"
			title="Toggle light / dark"
		>
			{dark ? '☀' : '☾'}
		</button>
		{#if data.user}
			<span class="user-chip">Signed in as <strong>{data.user.username}</strong></span>
			<form method="POST" action="/logout">
				<button class="btn-quiet" type="submit">Sign out</button>
			</form>
		{:else}
			<a href={resolve('/login')}>Sign in</a>
		{/if}
	</nav>
</header>

<main>{@render children()}</main>

<footer>
	香 Kōbako <span class="sep">·</span> a quiet place for an incense collection
</footer>
