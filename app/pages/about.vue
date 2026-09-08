<script setup lang="ts">
const modes = [
  { name: 'Regular bingo', text: 'Complete the goals on the squares and mark them as you get them. Try to get five in a line: a row, a column, or a diagonal. Play in the same room as other racers to see each other\'s progress.' },
  { name: 'Multi-bingo', text: 'Like regular bingo with several lines at once. In "triple bingo" you might go for column 1, row 5 and the TL-BR diagonal to use their overlapping squares.' },
  { name: 'Anti-bingo', text: 'Your opponent chooses the line you have to complete. Combine with multi-bingo for triple-anti-bingo shenanigans.' },
  { name: 'Blackout', text: 'Instead of single lines, complete the entire board. Work together on one board in team blackout and compete against other teams.' },
  { name: 'Lockout', text: 'Only one player can own a square. Once it is collected the others are locked out. Collect as many as you can until the board is full or the timer runs out.' },
  { name: 'Flip lockout', text: 'Lockout where you can steal. Collect two squares adjacent to an opponent\'s square (no diagonals) to flip it to your color, even without the goal itself.' }
]
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-10">
    <div>
      <h1 class="font-display text-3xl font-semibold tracking-tight">About Bingosync</h1>
      <div class="mt-4 space-y-3 text-toned leading-relaxed">
        <p>Bingosync lets people work on the same bingo board while racing a game. Create a room, share the link, and every square you mark shows up for everyone in the room in real time.</p>
        <p>Left-click a square to mark it in your color. Right-click a square to star it privately, which lets you plan a route without other players seeing it.</p>
      </div>
    </div>

    <section>
      <h2 class="font-display text-xl font-semibold mb-3">Ways to play</h2>
      <dl class="divide-y divide-default ring ring-default rounded-lg">
        <div v-for="mode in modes" :key="mode.name" class="grid sm:grid-cols-[10rem_1fr] gap-1 sm:gap-6 px-4 py-3">
          <dt class="font-medium">{{ mode.name }}</dt>
          <dd class="text-toned text-sm leading-relaxed">{{ mode.text }}</dd>
        </div>
      </dl>
    </section>

    <section class="space-y-3 text-toned leading-relaxed">
      <h2 class="font-display text-xl font-semibold text-default">Adding a game</h2>
      <p>New generators and variants come from the community. A generator needs a goal list, a full name for the room dropdown, and a short name of roughly 10 to 12 characters for the room list.</p>
      <p>There are two kinds of goal lists. An SRL-style list has 25 difficulty tiers (<a class="underline underline-offset-2" href="https://pastebin.com/G0mizGwV">example</a>): the generator takes one goal per tier and arranges them so every line adds up to a similar difficulty, and goals sharing a type never land in the same line. A simple list is just goal names (<a class="underline underline-offset-2" href="https://pastebin.com/J8aRHmrM">example</a>) picked at random without synergy checks.</p>
      <p>For a one-off board, use the Custom game type and paste a JSON list of 25 goals (<a class="underline underline-offset-2" href="https://pastebin.com/kqGNx5A8">example</a>). The randomized custom variant shuffles a longer list for you.</p>
    </section>

    <section class="space-y-3 text-toned leading-relaxed">
      <h2 class="font-display text-xl font-semibold text-default">Development and privacy</h2>
      <p>This site is a rebuild of <a class="underline underline-offset-2" href="https://github.com/kbuzsaki/bingosync">bingosync</a> by kbuzsaki, keeping its generators and board mechanics. Issues and pull requests for generators belong in the upstream repository.</p>
      <p>Room names, player names, goal actions and chat messages are stored so old rooms stay reachable. A cookie remembers which rooms you have joined. No accounts, emails or other personal data are collected.</p>
    </section>
  </div>
</template>
