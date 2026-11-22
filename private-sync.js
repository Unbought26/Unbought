/* ==========================================================================
   UNBOUGHT — private-sync.js

   Optional private-data bridge. Nothing here runs or sends private data until
   a member explicitly chooses "Sync my private data" and signs in.

   Passwords are handled only by Supabase Auth. This file never stores a
   password, password hash, or salt in localStorage or in a private table.
   ========================================================================== */
(() => {
  'use strict';

  const CONFIG = window.UNBOUGHT_SUPABASE || {};
  const AUTH_STORAGE_KEY = 'unbought:private-auth';
  let clientPromise = null;

  function normalizedUrl() {
    return String(CONFIG.url || '').trim().replace(/\/+$/, '');
  }

  function publishableKey() {
    return String(CONFIG.anonKey || CONFIG.publishableKey || '').trim();
  }

  function validPublicKey(key) {
    return /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
      || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);
  }

  function isConfigured() {
    const key = publishableKey();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalizedUrl())
      && validPublicKey(key);
  }

  function setStatus(status) {
    document.documentElement.dataset.privateSync = status;
  }

  setStatus(isConfigured() ? 'configured' : 'local');

  async function getClient() {
    if (!isConfigured()) return null;
    if (clientPromise) return clientPromise;

    clientPromise = import('https://esm.sh/@supabase/supabase-js@2.49.8')
      .then(({ createClient }) => createClient(normalizedUrl(), publishableKey(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY,
          flowType: 'pkce'
        }
      }))
      .catch((error) => {
        clientPromise = null;
        setStatus('error');
        console.warn('Unbought private sync could not load Supabase.', error);
        return null;
      });

    return clientPromise;
  }

  function friendlyError(error, fallback) {
    const code = error && error.code ? String(error.code) : '';
    const raw = error && error.message ? String(error.message) : '';
    if (/already registered/i.test(raw)) return 'That email already has an account. Sign in instead.';
    if (/invalid login credentials/i.test(raw)) return 'That email and password do not match.';
    if (/email not confirmed/i.test(raw)) return 'Confirm your email first, then sign in again.';
    if (code === '42501') return 'Private sync is not ready on the server yet.';
    return fallback || 'Could not complete private sync.';
  }

  async function run(task, fallback) {
    try {
      return await task();
    } catch (error) {
      setStatus('error');
      console.warn('Unbought private sync error.', error);
      return { ok: false, error: friendlyError(error, fallback) };
    }
  }

  async function currentSession() {
    const client = await getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data && data.session ? data.session : null;
  }

  async function sessionInfo() {
    return run(async () => {
      const session = await currentSession();
      if (!session) return { ok: true, signedIn: false };
      setStatus('connected');
      return {
        ok: true,
        signedIn: true,
        userId: session.user && session.user.id ? session.user.id : '',
        email: session.user && session.user.email ? session.user.email : ''
      };
    }, 'Could not check your private sync session.');
  }

  async function signIn(email, password) {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');
      if (!cleanEmail || !cleanPassword) return { ok: false, error: 'Enter your email and password.' };

      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });
      if (error) return { ok: false, error: friendlyError(error) };
      if (!data || !data.session) return { ok: false, error: 'Sign in did not return a session.' };

      setStatus('connected');
      return { ok: true, email: cleanEmail };
    }, 'Could not sign in.');
  }

  async function signUp(email, password) {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');
      if (!cleanEmail || !cleanPassword) return { ok: false, error: 'Enter your email and password.' };
      if (cleanPassword.length < 8) return { ok: false, error: 'Use a password of at least 8 characters.' };

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: window.location.href.split('#')[0]
        }
      });
      if (error) return { ok: false, error: friendlyError(error) };

      if (!data || !data.session) {
        setStatus('confirm-email');
        return {
          ok: false,
          needsConfirmation: true,
          error: 'Check your email to confirm the account, then sign in and sync again.'
        };
      }

      setStatus('connected');
      return { ok: true, email: cleanEmail };
    }, 'Could not create a private sync account.');
  }

  async function signOut() {
    return run(async () => {
      const client = await getClient();
      let remoteError = null;
      if (client) {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) remoteError = error;
      }

      // Supabase Auth may keep the local session when a sign-out call fails.
      // Always clear the stored session so "off" really means signed out here.
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(AUTH_STORAGE_KEY))
          .forEach((key) => localStorage.removeItem(key));
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith(AUTH_STORAGE_KEY))
          .forEach((key) => sessionStorage.removeItem(key));
      } catch (error) {
        // Storage may be blocked; the cached client is still reset below.
      }
      clientPromise = null;
      setStatus('signed-out');

      if (remoteError) {
        return { ok: false, error: friendlyError(remoteError), localCleared: true };
      }
      return { ok: true, localCleared: true };
    }, 'Could not sign out of private sync.');
  }

  async function pushPrivate(snapshot) {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const session = await currentSession();
      if (!session || !session.user) return { ok: false, error: 'Sign in before syncing private data.' };

      const userId = session.user.id;
      const jobs = [];

      if (snapshot && snapshot.member) {
        jobs.push({
          label: 'member record',
          query: client.from('private_members').upsert(
            { ...snapshot.member, user_id: userId },
            { onConflict: 'user_id' }
          )
        });
      }
      if (snapshot && snapshot.waitlist) {
        jobs.push({
          label: 'waiting-list entry',
          query: client.from('private_waitlist_entries').upsert(
            { ...snapshot.waitlist, user_id: userId },
            { onConflict: 'user_id' }
          )
        });
      }
      if (!jobs.length) return { ok: true, pushed: [], skipped: true };

      const pushed = [];
      for (const job of jobs) {
        const { error } = await job.query;
        if (error) return { ok: false, pushed, error: friendlyError(error, `Could not save the ${job.label}.`) };
        pushed.push(job.label);
      }

      setStatus('connected');
      return { ok: true, pushed };
    }, 'Could not save private data.');
  }

  async function fetchPrivate() {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const session = await currentSession();
      if (!session || !session.user) return { ok: false, error: 'Sign in before reading private data.' };

      const userId = session.user.id;
      const [member, waitlist] = await Promise.all([
        client.from('private_members').select('*').eq('user_id', userId).maybeSingle(),
        client.from('private_waitlist_entries').select('*').eq('user_id', userId).maybeSingle()
      ]);

      const failed = [member, waitlist].find((result) => result && result.error);
      if (failed) return { ok: false, error: friendlyError(failed.error, 'Could not read private data.') };

      setStatus('connected');
      return { ok: true, member: member.data || null, waitlist: waitlist.data || null };
    }, 'Could not read private data.');
  }

  async function deletePrivate(memberId) {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const session = await currentSession();
      if (!session || !session.user) return { ok: false, error: 'Sign in before deleting private data.' };

      const userId = session.user.id;
      const localMemberId = String(memberId || '').trim().slice(0, 100);
      // Delete the flag first: its RLS check looks for the opted-in member row.
      if (localMemberId) {
        const flagResult = await client
          .from('private_admin_report_flags')
          .delete()
          .eq('member_id', localMemberId);
        if (flagResult && flagResult.error) {
          return { ok: false, error: friendlyError(flagResult.error, 'Could not delete the report flag.') };
        }
      }
      const results = await Promise.all([
        client.from('private_members').delete().eq('user_id', userId),
        client.from('private_waitlist_entries').delete().eq('user_id', userId)
      ]);

      const failed = results.find((result) => result && result.error);
      if (failed) return { ok: false, error: friendlyError(failed.error, 'Could not delete private data.') };

      setStatus('connected');
      return { ok: true };
    }, 'Could not delete private data.');
  }

  async function deletePrivateWaitlist() {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const session = await currentSession();
      if (!session || !session.user) return { ok: false, error: 'Sign in before deleting private data.' };

      const { error } = await client
        .from('private_waitlist_entries')
        .delete()
        .eq('user_id', session.user.id);
      if (error) return { ok: false, error: friendlyError(error, 'Could not delete the waiting-list entry.') };

      setStatus('connected');
      return { ok: true };
    }, 'Could not delete the waiting-list entry.');
  }

  // Sends only the reported member's local ID and an open/settled status.
  // Report text, evidence, reasons, and reporter details never enter this call.
  async function setAdminReportFlag(memberId, status) {
    return run(async () => {
      const client = await getClient();
      if (!client) return { ok: false, error: 'Private sync is not configured.' };

      const session = await currentSession();
      if (!session || !session.user) return { ok: false, error: 'Sign in before sending a report flag.' };

      const reportedMemberId = String(memberId || '').trim().slice(0, 100);
      const nextStatus = status === 'settled' ? 'settled' : 'open';
      if (!reportedMemberId) return { ok: false, error: 'The reported member ID is missing.' };

      if (nextStatus === 'settled') {
        // A settled flag updates the row created when the report was filed. If
        // no row exists (for example, sync was enabled later), there is nothing
        // to pause, so a no-op is still success.
        const { error } = await client
          .from('private_admin_report_flags')
          .update({ status: 'settled' })
          .eq('member_id', reportedMemberId);
        if (error) return { ok: false, error: friendlyError(error, 'Could not settle the report flag.') };
        setStatus('connected');
        return { ok: true, status: nextStatus, updated: true };
      }

      const { error } = await client
        .from('private_admin_report_flags')
        .upsert(
          { member_id: reportedMemberId, status: 'open' },
          { onConflict: 'member_id' }
        );
      if (error) return { ok: false, error: friendlyError(error, 'Could not save the report flag.') };

      setStatus('connected');
      return { ok: true, status: nextStatus };
    }, 'Could not save the report flag.');
  }

  function onSessionChange(callback) {
    if (typeof callback !== 'function') return () => {};
    let unsubscribe = null;
    let disposed = false;
    const notify = (info) => {
      if (!disposed) callback(info);
    };

    void getClient().then((client) => {
      if (!client || disposed) return;
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        notify({
          signedIn: Boolean(session),
          email: session && session.user ? (session.user.email || '') : ''
        });
      });
      if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
        if (disposed) data.subscription.unsubscribe();
        else unsubscribe = () => data.subscription.unsubscribe();
      }
      void sessionInfo().then((info) => {
        if (info.ok) notify(info);
      });
    });

    return () => {
      disposed = true;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
  }

  window.UnboughtPrivateSync = {
    isConfigured,
    sessionInfo,
    signIn,
    signUp,
    signOut,
    pushPrivate,
    fetchPrivate,
    deletePrivate,
    deletePrivateWaitlist,
    setAdminReportFlag,
    onSessionChange
  };
})();
