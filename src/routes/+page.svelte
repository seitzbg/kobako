<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-head">
	<p class="kicker">Your collection</p>
	<h1>Welcome, {data.user.username}</h1>
	<div class="rule"></div>
	<p style="margin-top:1rem">
		Signed in as <strong>{data.user.username}</strong>
		<span class="muted">· {data.user.role}</span>
	</p>
</div>

<div class="empty">
	<div class="mark">香</div>
	<h2 style="font-size:1.2rem;margin:0">Your incense catalog lands here soon</h2>
	<p>
		Ratings, written reviews and a dated burn log for every stick, cone and coil — arriving in the
		next chapter.
	</p>
</div>
