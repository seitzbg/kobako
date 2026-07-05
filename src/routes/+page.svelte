<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>Welcome to Kōbako</h1>
<p>Signed in as <strong>{data.user.username}</strong> ({data.user.role}).</p>
<p>Your incense catalog lands here in Plan 2.</p>
