// Demo data generator - used only when no search provider (API key) is configured.
// Produces results in the same shape as real extracted leads so the UI is testable.

import type { Lead } from "./extractors";
import { platformFromUrl } from "./footprints";

const SAMPLES: Array<{ email: string; caption: string; url: string }> = [
  { email: "explorerdistribution@gmail.com", caption: "Cannon Alpha owners - 3-door canopy packages built for the trade...", url: "https://www.instagram.com/p/DQlV5yhDwNi/" },
  { email: "shanwaritikkahouse@gmail.com", caption: "Enjoy authentic Shinwari tikka, grilled fresh, in the open air...", url: "https://www.instagram.com/p/DUPmZMImARj/" },
  { email: "lahore2delhi@gmail.com", caption: "PREMIUM LAMB CUTLETS - Juicy, tender and flame-grilled...", url: "https://www.instagram.com/p/DbKvSczHLBI/" },
  { email: "karwanrestaurant77@gmail.com", caption: "Make your Sunday Iftaari special with our slow-cooked specials...", url: "https://www.instagram.com/p/DVCMX4ODkGb/" },
  { email: "caterings.au@gmail.com", caption: "Lamb Shank Kabuli Pulao Slow-cooked to perfection...", url: "https://www.instagram.com/p/DS6PKK7DCKX/" },
  { email: "pishnermech@gmail.com", caption: "We are looking for Journeyman Plumbers to join Hall Mechanical...", url: "https://www.instagram.com/reel/DMp9XD-v4Af/" },
  { email: "kissanindianrestaurant@gmail.com", caption: "Treat Dad to a meal he'll truly enjoy this Father's Day...", url: "https://www.instagram.com/p/DZuLJZYEt1i/" },
  { email: "mercedesbenzvanshawaii@gmail.com", caption: "Celebrating its 30th birthday at Mercedes-Benz Perth...", url: "https://www.instagram.com/reel/DNermjPMMhS/" },
  { email: "dreamsraz@gmail.com", caption: "Throwback to our March 2020 project completion...", url: "https://www.instagram.com/p/B-MaDGhlVVY/" },
  { email: "cherrywoodsmokehousenotts@gmail.com", caption: "Perfectly spiced and grilled to perfection. Our Seekh kebabs...", url: "https://www.instagram.com/p/DVA_ElNCZQ8/" },
  { email: "ua.architekts@gmail.com", caption: "The Rushcutters: 13 luxury apartments now selling...", url: "https://www.instagram.com/reel/DQvT1fEEQ3j/" },
  { email: "bookingvelchi@gmail.com", caption: "Rich, creamy, and full of soul. Our Chicken Korma is a classic...", url: "https://www.instagram.com/p/DWtVN28FYEc/" },
  { email: "gulnaz@dss-hr.com", caption: "All candidates must submit their CV to gulnaz@dss-hr.com...", url: "https://www.instagram.com/p/DT2l33hk8dC/" },
  { email: "congphap28@gmail.com", caption: "Ben Smith | Carpenter | DIY expert | If you're stuck on a build...", url: "https://www.instagram.com/reel/DXqwKXmE7jS/" },
  { email: "nirmalimmigration34@gmail.com", caption: "Australia Work & Holiday Visa (462) Open Dates now available...", url: "https://www.instagram.com/reel/DY6YPZSJbgQ/" },
  { email: "akashresturent@gmail.com", caption: "Biryani | You can almost smell the smoke through the screen...", url: "https://www.instagram.com/p/DYjjZJEFpZG/" },
  { email: "luikycompany@gmail.com", caption: "Photo by UA Service Mechanics Group on site this week...", url: "https://www.instagram.com/p/Dap33-_o-XL/" },
  { email: "skipsplumbingllc@gmail.com", caption: "This is the Pit Bull olive puller set. Designed to extract stuck...", url: "https://www.instagram.com/reel/DTpyXV6jMcT/" },
  { email: "punjabisunrise@gmail.com", caption: "Some dishes don't just fill you up, they stay on your mind...", url: "https://www.instagram.com/p/DWdGFgnGTEI/" },
  { email: "info@fixitplumbing.com.au", caption: "24/7 emergency plumbing across Sydney. Call us for blocked drains...", url: "https://www.instagram.com/p/DWabc123XYZ/" },
];

function initials(text: string): string {
  const clean = text.replace(/[^a-zA-Z ]/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (text.replace(/[^a-zA-Z]/g, "").slice(0, 2) || "IG").toUpperCase();
}

function scoreFor(email: string): number {
  let score = 55;
  if (email) score += 25;
  if (!email.includes("gmail") && !email.includes("hotmail")) score += 12; // business domain
  if (email.split("@")[0].length > 8) score += 5;
  return Math.min(score, 96);
}

export function demoLeads(keyword: string, platform: string, country: string): Lead[] {
  return SAMPLES.map((s) => {
    const isRole = /^(info|admin|support|sales|contact|booking|hello)/.test(s.email.split("@")[0]);
    return {
      id: s.email.toLowerCase(),
      avatar: initials(s.caption),
      platform: platformFromUrl(s.url),
      name: s.caption.split(/[.|]/)[0].slice(0, 40),
      description: s.caption,
      username: "—",
      website: s.email.includes("@") && !s.email.includes("gmail") && !s.email.includes("hotmail")
        ? s.email.split("@")[1]
        : "—",
      email: s.email,
      phone: "—",
      followers: "—",
      country: country && country !== "All Countries" && !country.startsWith("—") ? country : "au",
      status: isRole ? "pending" : "pending",
      leadScore: scoreFor(s.email),
      profileUrl: s.url,
    };
  });
}
