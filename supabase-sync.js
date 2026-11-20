/* ==========================================================================
   UNBOUGHT — supabase-sync.js

   Public-data-only Supabase bridge for the static prototype.

   This file never loads Supabase unless supabase-config.js contains a real
   project URL and publishable/anon key. It syncs only public directory data:
   group cards, Free Labor/Free Stuff listings, community channels, community
   threads, and community chat posts.

   It does NOT sync pledge records, passwords, legal names, addresses, phone
   numbers, birthdates, messages, reports, donations, waitlist entries, photos,
   listing comments, group chats, or social chats.
   ========================================================================== */
(() => {
  'use strict';

  const CONFIG = window.UNBOUGHT_SUPABASE || {};
  const TABLES = Object.freeze({
    groups: 'public_groups',
    listings: 'public_listings',
    channels: 'public_community_channels',
    threads: 'public_community_threads',
    posts: 'public_community_posts'
  });

  let clientPromise = null;

  function normalizedUrl() {
    return String(CONFIG.url || '').trim().replace(/\/+$/, '');
  }

  function publishableKey() {
    return String(CONFIG.anonKey || CONFIG.publishableKey || '').trim();
  }

  function isConfigured() {
    const url = normalizedUrl();
    const key = publishableKey();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length >= 40;
  }

  function setStatus(status) {
    document.documentElement.dataset.publicDataSync = status;
  }

  setStatus(isConfigured() ? 'configured' : 'local');

  async function getClient() {
    if (!isConfigured()) return null;
    if (clientPromise) return clientPromise;

    clientPromise = import('https://esm.sh/@supabase/supabase-js@2.49.8')
      .then(({ createClient }) => {
        const client = createClient(normalizedUrl(), publishableKey(), {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });
        setStatus('connected');
        return client;
      })
      .catch((error) => {
        clientPromise = null;
        setStatus('error');
        console.warn('Unbought public data sync could not load Supabase.', error);
        return null;
      });

    return clientPromise;
  }

  async function fetchPublicData() {
    const client = await getClient();
    if (!client) return null;

    const results = await Promise.all([
      client.from(TABLES.groups).select('*').order('created_at', { ascending: true }).limit(1000),
      client.from(TABLES.listings).select('*').order('created_at', { ascending: true }).limit(1000),
      client.from(TABLES.channels).select('*').order('created_at', { ascending: true }).limit(1000),
      client.from(TABLES.threads).select('*').order('created_at', { ascending: true }).limit(1000),
      client.from(TABLES.posts).select('*').order('created_at', { ascending: true }).limit(1000)
    ]);

    const failed = results.find((result) => result.error);
    if (failed) {
      setStatus('error');
      console.warn('Unbought public data could not be loaded.', failed.error);
      return null;
    }

    setStatus('connected');
    return {
      groups: results[0].data || [],
      listings: results[1].data || [],
      channels: results[2].data || [],
      threads: results[3].data || [],
      posts: results[4].data || []
    };
  }

  async function pushPublicData(snapshot) {
    const client = await getClient();
    if (!client) return { ok: false, pushed: [] };

    const batches = [
      [TABLES.groups, (snapshot && snapshot.groups) || []],
      [TABLES.listings, (snapshot && snapshot.listings) || []],
      [TABLES.channels, (snapshot && snapshot.channels) || []],
      [TABLES.threads, (snapshot && snapshot.threads) || []],
      [TABLES.posts, (snapshot && snapshot.posts) || []]
    ].filter((entry) => entry[1].length);

    if (!batches.length) return { ok: true, pushed: [] };

    const pushed = [];
    let failed = false;

    for (const [table, rows] of batches) {
      const { error } = await client.from(table).insert(rows);
      if (error) {
        // Duplicate IDs mean the row already exists in Supabase. Treat them as
        // synced so a later save does not retry the same insert forever.
        if (error.code === '23505') {
          rows.forEach((row) => pushed.push(`${table}:${row.id}`));
        } else {
          failed = true;
          console.warn(`Unbought public data could not be saved to ${table}.`, error);
        }
      } else {
        rows.forEach((row) => pushed.push(`${table}:${row.id}`));
      }
    }

    setStatus(failed ? 'error' : 'connected');
    return { ok: !failed, pushed };
  }

  window.UnboughtSupabase = {
    isConfigured,
    fetchPublicData,
    pushPublicData
  };
})();
