// [AI] VAPID keys for Web Push notifications
// Generate new keys: node -e "const w=require('web-push'); console.log(JSON.stringify(w.generateVAPIDKeys()))"

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BJ94bQPSooKkOlv0X_nNKDnTn-Lz-Z1dMbdGE_l4BUytU33H43Kl8nTmBEddnv2MsBWfFWZ3JN-Cliv9fF8oIbc';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pAB0LgC6lSy2bAqeXzVBFaC1jR6hTDpljjr58q664sw';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sentralogis.com';
