/* ==========================================================================
   UNBOUGHT — supabase-sync.js

   Public-data-only Supabase bridge for the static prototype.

   This file never loads Supabase unless supabase-config.js contains a real
   project URL and publishable/anon key. It syncs only public directory data:
   group cards, Free Labor/Free Stuff listings, community channels, community
   threads, community chat posts, and contact addresses members explicitly
    publish for direct Unbought messages.

   Anonymous visitors can read public data. Shared-content writes go through
   validated database functions and require a signed-in, pledged Supabase Auth
   member. No client-supplied member ID is trusted for a write.

   This file does NOT sync pledge records, passwords, legal names, addresses,
   phone numbers, birthdates, messages, reports, donations, waitlist entries,
   photos, listing comments, group chats, or social chats.
   ========================================================================== */
(() => {
  'use strict';

  const CONFIG = window.UNBOUGHT_SUPABASE || {};
  const SDK_URL = './vendor/supabase/supabase-js-2.49.8.bundle.mjs';
  const AUTH_STORAGE_KEY = 'unbought:private-auth';
  const TABLES = Object.freeze({
    groups: 'public_groups',
    listings: 'public_listings',
    channels: 'public_community_channels',
    threads: 'public_community_threads',
    posts: 'public_community_posts',
    contacts: 'public_member_contacts'
  });
  const KINDS = Object.freeze(Object.keys(TABLES));
  // Contacts are published only through unbought_set_public_contact, never
  // through the generic public-content write function.
  const WRITABLE_KINDS = Object.freeze(KINDS.filter((kind) => kind !== 'contacts'));

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

    clientPromise = import(SDK_URL)
      .then(({ createClient }) => {
        const client = createClient(normalizedUrl(), publishableKey(), {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: AUTH_STORAGE_KEY,
            flowType: 'pkce'
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

  function selectedKinds(kinds) {
    if (!Array.isArray(kinds) || !kinds.length) return KINDS.slice();
    return KINDS.filter((kind) => kinds.includes(kind));
  }

  async function fetchPublicData(kinds) {
    const client = await getClient();
    if (!client) return null;

    const chosen = selectedKinds(kinds);
    if (!chosen.length) return {};

    const results = await Promise.all(chosen.map((kind) => (
      client.from(TABLES[kind]).select('*').order('created_at', { ascending: true }).limit(1000)
    )));

    const failed = results.find((result) => result && result.error);
    if (failed) {
      setStatus('error');
      console.warn('Unbought public data could not be loaded.', failed.error);
      return null;
    }

    setStatus('connected');
    const data = {};
    chosen.forEach((kind, index) => {
      data[kind] = (results[index] && results[index].data) || [];
    });
    return data;
  }

  function writeError(error) {
    const code = error && error.code ? String(error.code) : '';
    const raw = error && error.message ? String(error.message) : '';
    if (code === '42501' || code === '401' || /signed-in|pledged member|permission denied/i.test(raw)) {
      return 'Sign in as a pledged member before changing shared site content.';
    }
    if (code === '22023' || /invalid|valid contact|email address/i.test(raw)) return 'That shared content could not be saved because a field was invalid.';
    return raw || 'Shared site content could not be saved.';
  }

  async function canPublishPublicData() {
    const client = await getClient();
    if (!client) return false;
    const { data } = await client.auth.getSession();
    return Boolean(data && data.session && data.session.user);
  }

  async function pushPublicData(snapshot) {
    const client = await getClient();
    if (!client) return { ok: false, pushed: [], error: 'Public data sync is not configured.' };
    // Reads stay anon, but never attempt a shared write until Supabase Auth has
    // a signed-in member. The database still performs the pledged-member check.
    if (!(await canPublishPublicData())) {
      setStatus('configured');
      return { ok: false, pushed: [], error: 'Sign in as a pledged member before changing shared site content.' };
    }

    const batches = [];
    WRITABLE_KINDS.forEach((kind) => {
      const rows = snapshot && Array.isArray(snapshot[kind]) ? snapshot[kind] : [];
      rows.forEach((row) => {
        if (row && row.id) batches.push({ kind, table: TABLES[kind], row });
      });
    });

    if (!batches.length) return { ok: true, pushed: [] };

    const pushed = [];
    for (const batch of batches) {
      const { error } = await client.rpc('unbought_write_public_data', {
        p_kind: batch.kind,
        p_row: batch.row
      });
      if (error) {
        const message = writeError(error);
        setStatus('error');
        console.warn('Unbought shared content could not be saved.', error);
        return { ok: false, pushed, error: message };
      }
      pushed.push(`${batch.table}:${batch.row.id}`);
    }

    setStatus('connected');
    return { ok: true, pushed };
  }

  async function setPublicContact(email) {
    const client = await getClient();
    if (!client) return { ok: false, error: 'Public data sync is not configured.' };

    // The database derives the member ID and display name from the signed-in
    // record; the browser supplies only the email the member chose to publish.
    const { error } = await client.rpc('unbought_set_public_contact', {
      p_email: String(email || '').trim()
    });
    if (error) {
      const raw = error && error.message ? String(error.message) : '';
      const message = error && error.code === '22023'
        ? (raw || 'Enter a valid contact email address.')
        : writeError(error);
      setStatus('error');
      console.warn('Unbought public contact could not be saved.', error);
      return { ok: false, error: message };
    }

    setStatus('connected');
    return { ok: true };
  }

  window.UnboughtSupabase = {
    isConfigured,
    canPublishPublicData,
    fetchPublicData,
    pushPublicData,
    setPublicContact
  };
})();
