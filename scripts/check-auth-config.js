const fs = require('fs');
const path = require('path');

async function checkKindeConfig() {
  console.log('--- Kinde Configuration Checker ---');
  
  const requiredVars = [
    'KINDE_CLIENT_ID',
    'KINDE_CLIENT_SECRET',
    'KINDE_ISSUER_URL',
    'KINDE_SITE_URL',
    'KINDE_POST_LOGOUT_REDIRECT_URL',
    'KINDE_POST_LOGIN_REDIRECT_URL'
  ];
  
  const status = {};
  let allPresent = true;

  requiredVars.forEach(v => {
    const val = process.env[v];
    status[v] = val ? 'PRESENT' : 'MISSING';
    if (!val) allPresent = false;
  });

  console.table(status);

  if (allPresent) {
    const siteUrl = process.env.KINDE_SITE_URL;
    if (siteUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ WARNING: KINDE_SITE_URL is set to localhost but environment is production.');
    }
    
    if (!siteUrl.startsWith('https://') && !siteUrl.includes('localhost')) {
      console.warn('⚠️ WARNING: Site URL should use https:// for Vercel production.');
    }
  }

  // Check Supabase key format
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbKey && !sbKey.startsWith('sb_secret_')) {
    console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY looks like an old JWT format. Ensure it matches the new "sb_secret_" format from your dashboard.');
  }

  console.log('--- Check Complete ---');
}

checkKindeConfig();
