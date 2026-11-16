/* ==========================================================================
   UNBOUGHT — quote of the day

   A date-seeded quote pool. The same quote is shown to everyone for the
   current day, changes automatically at midnight, and can be shuffled by
   hand. No network requests, no tracking, no build step.
   ========================================================================== */
(() => {
  'use strict';

  const QUOTES = Object.freeze([
    Object.freeze({
      text: 'Freedom is the freedom to say that two plus two make four. If that is granted, all else follows.',
      author: 'George Orwell',
      source: '1984, 1949',
      note: 'A society that cannot say what is true cannot consent to what is done to it. Unbought begins with plain speech and mutual consent.'
    }),
    Object.freeze({
      text: 'Political language is designed to make lies sound truthful and murder respectable, and to give an appearance of solidity to pure wind.',
      author: 'George Orwell',
      source: 'Politics and the English Language, 1946',
      note: 'Prices hide decisions. Plain language lets neighbors see who benefits, who pays, and who is asked to stay quiet.'
    }),
    Object.freeze({
      text: 'Mutual aid is as much a law of animal life as mutual struggle.',
      author: 'Peter Kropotkin',
      source: 'Mutual Aid, 1902',
      note: 'Survival has always depended on cooperation. Unbought makes that mutual aid visible again.'
    }),
    Object.freeze({
      text: 'Well-being for all is not a dream.',
      author: 'Peter Kropotkin',
      source: 'The Conquest of Bread, 1892',
      note: 'A world without price tags is not a fantasy. It is a design choice we can begin practicing now.'
    }),
    Object.freeze({
      text: 'Property is theft!',
      author: 'Pierre-Joseph Proudhon',
      source: 'What Is Property?, 1840',
      note: 'Private ownership of what everyone needs is a choice, not a law of nature. Unbought practices a different claim.'
    }),
    Object.freeze({
      text: 'The passion for destruction is also a creative passion.',
      author: 'Mikhail Bakunin',
      source: 'The Reaction in Germany, 1842',
      note: 'The old structures do not fall because we ask nicely. They fall when we stop feeding them—and build something better in their place.'
    }),
    Object.freeze({
      text: 'Freedom is always and exclusively freedom for the one who thinks differently.',
      author: 'Rosa Luxemburg',
      source: 'The Russian Revolution, 1918',
      note: 'A free society has to make room for disagreement. Consent means nothing if it only protects the people who already agree.'
    }),
    Object.freeze({
      text: 'The proper aim is to try and reconstruct society on such a basis that poverty will be impossible.',
      author: 'Oscar Wilde',
      source: 'The Soul of Man under Socialism, 1891',
      note: 'Poverty is not a personal failure. It is a distribution we chose. Unbought treats its end as a design requirement.'
    }),
    Object.freeze({
      text: 'Money is a new form of slavery, and distinguishable from the old simply by the fact that it is impersonal—that there is no human relation between master and slave.',
      author: 'Leo Tolstoy',
      source: 'What Shall We Do Then?, 1886',
      note: 'If money is the fuel, mutual aid is the off switch. Every need met without a price is a little less power for the machine.'
    }),
    Object.freeze({
      text: 'Fellowship is heaven, and lack of fellowship is hell.',
      author: 'William Morris',
      source: 'A Dream of John Ball, 1888',
      note: 'Belonging is the first form of wealth. Unbought measures itself by how well it keeps people connected.'
    }),
    Object.freeze({
      text: 'While there is a lower class, I am in it; while there is a criminal element, I am of it; while there is a soul in prison, I am not free.',
      author: 'Eugene V. Debs',
      source: 'Canton, Ohio speech, 1918',
      note: 'No one is free while someone else is caged. Unbought begins with the people the market leaves behind.'
    }),
    Object.freeze({
      text: 'There are a thousand hacking at the branches of evil to one who is striking at the root.',
      author: 'Henry David Thoreau',
      source: 'Walden, 1854',
      note: 'Most reform hacks at symptoms. Unbought goes after the root: the assumption that survival must be bought.'
    })
  ]);

  const textEl = document.getElementById('quote-text');
  if (!textEl) return;

  const authorEl = document.getElementById('quote-author');
  const sourceEl = document.getElementById('quote-source');
  const noteEl = document.getElementById('quote-note');
  const badgeEl = document.getElementById('quote-badge');
  const buttonEl = document.getElementById('quote-shuffle');
  const statusEl = document.getElementById('quote-status');
  let currentIndex = -1;

  function dailyIndex() {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let hash = 2166136261;

    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) % QUOTES.length;
  }

  function render(index, isDaily) {
    const quote = QUOTES[index];
    currentIndex = index;

    textEl.textContent = quote.text;
    authorEl.textContent = quote.author;
    sourceEl.textContent = quote.source;
    noteEl.textContent = quote.note;

    if (badgeEl) {
      badgeEl.textContent = isDaily ? 'Today’s quote' : 'Another voice';
    }
  }

  render(dailyIndex(), true);

  if (!buttonEl) return;

  buttonEl.addEventListener('click', () => {
    let next = Math.floor(Math.random() * QUOTES.length);

    if (QUOTES.length > 1 && next === currentIndex) {
      next = (next + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length;
    }

    render(next, false);

    if (statusEl) {
      statusEl.textContent = `${QUOTES[next].author}: ${QUOTES[next].text}`;
    }
  });
})();
