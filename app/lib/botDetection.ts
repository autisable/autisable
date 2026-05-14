// Bot user-agent detection used to keep automated scanner traffic out of the
// broken-links audit. Conservative on purpose: false negatives (a missed bot)
// just shows up as a row the admin can clear; false positives (a real
// visitor flagged as a bot) would silently drop their 404 hits and we'd
// never know there was a broken link. So the patterns target user-agents
// that explicitly self-identify, and we keep the list focused on scanners
// known to hammer 404 endpoints rather than every crawler under the sun.

const BOT_PATTERNS = [
  // Generic self-identifiers
  /\bbot\b/i,
  /crawler/i,
  /spider/i,
  /scrap(er|y|ing)/i,
  /fetcher/i,
  /headless/i,
  // HTTP clients that almost never represent a real visitor
  /\bcurl\//i,
  /\bwget\//i,
  /python-requests/i,
  /python-urllib/i,
  /Go-http-client/i,
  /libwww-perl/i,
  /java\//i,
  /okhttp/i,
  /httpclient/i,
  /aiohttp/i,
  // Well-known crawlers and previewers
  /Googlebot/i,
  /Bingbot/i,
  /DuckDuckBot/i,
  /YandexBot/i,
  /Baiduspider/i,
  /facebookexternalhit/i,
  /Slackbot/i,
  /TwitterBot/i,
  /LinkedInBot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Applebot/i,
  /SemrushBot/i,
  /AhrefsBot/i,
  /MJ12bot/i,
  /DotBot/i,
  /PetalBot/i,
  // Vulnerability and content scanners
  /Acunetix/i,
  /Nessus/i,
  /Nikto/i,
  /sqlmap/i,
  /wfuzz/i,
  /\bdirb\b/i,
  /gobuster/i,
  /feroxbuster/i,
  /Zgrab/i,
  /masscan/i,
  /Nuclei/i,
];

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}
