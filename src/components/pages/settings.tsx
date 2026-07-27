"use client";

import { useState } from "react";
import { User, Bell, CreditCard, Globe, Server, Zap } from "lucide-react";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [notifications, setNotifications] = useState({
    searchComplete: true,
    weeklyReport: true,
    creditsLow: true,
    newFeatures: false,
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t.settings.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <User size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input
              type="text"
              defaultValue="Social Discovery"
              className="w-full h-9 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              defaultValue="admin@socialdiscovery.io"
              className="w-full h-9 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <input
              type="text"
              defaultValue="Social Discovery Inc."
              className="w-full h-9 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <select className="w-full h-9 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
              <option>UTC-5 (Eastern Time)</option>
              <option>UTC-8 (Pacific Time)</option>
              <option>UTC+0 (GMT)</option>
              <option>UTC+1 (CET)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bell size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(notifications).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
            >
              <span className="text-sm text-foreground capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !value }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  value ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    value ? "left-5.5 translate-x-0" : "left-0.5"
                  }`}
                  style={{ left: value ? "22px" : "2px" }}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Billing & Plan</h3>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div>
            <div className="text-sm font-medium text-foreground">Pro Plan</div>
            <div className="text-xs text-muted-foreground mt-0.5">60,000 credits/month · Unlimited exports</div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors">
            Upgrade
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground">Credits Remaining</div>
            <div className="text-lg font-bold text-foreground mt-1">45,200 / 60,000</div>
            <div className="w-full h-1.5 rounded-full bg-secondary mt-2">
              <div className="w-3/4 h-full rounded-full bg-primary" />
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground">Renewal Date</div>
            <div className="text-lg font-bold text-foreground mt-1">Nov 1, 2024</div>
            <div className="text-xs text-muted-foreground mt-1">Auto-renew enabled</div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <Globe size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.settings.language}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t.settings.languageHint}</p>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(LOCALES) as [Locale, { label: string; flag: string }][]).map(
            ([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all ${
                  locale === code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-lg">{flag}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-card rounded-xl border border-primary/20 p-6 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Coming Soon</h3>
            <p className="text-[11px] text-muted-foreground">Building the future of sales automation</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          We&apos;re building the future of sales automation. Soon you&apos;ll be able to connect your WhatsApp account
          and send email sequences directly from the platform.
        </p>

        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-border bg-background/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-base">🤖</span>
              <span className="text-sm font-medium text-foreground">AI Cold Outreach Agent</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">SOON</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Design and automate complete sequences of highly personalized emails and WhatsApp messages
              to convert cold prospects into scheduled meetings.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-base">💬</span>
              <span className="text-sm font-medium text-foreground">WhatsApp Integration</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">SOON</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your WhatsApp Business account and send personalized messages at scale
              directly to the leads you discover.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-base">📧</span>
              <span className="text-sm font-medium text-foreground">Email Sequences</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">SOON</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Multi-step drip campaigns with AI-written follow-ups, smart timing,
              and automatic stop on reply.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-base">🔗</span>
              <span className="text-sm font-medium text-foreground">200+ Integrations (Composio)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">SOON</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send your leads directly to HubSpot, Google Sheets, Notion, Salesforce, Slack, Airtable
              or any of 200+ platforms via{" "}
              <a href="https://composio.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Composio.dev
              </a>
              . Connect once, export anywhere.
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Reminder */}
      <div className="bg-card rounded-xl border border-warning/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server size={18} className="text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Deployment</h3>
        </div>
        <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-warning font-medium">Important:</span> This app requires a <span className="text-foreground font-medium">VPS or dedicated server</span> (Node.js 22+, persistent filesystem, outbound HTTP/DNS).
            Static hosts like Netlify or Vercel <span className="text-foreground font-medium">will NOT work</span> — the backend needs SQLite, real DNS lookups, and a running process.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">Recommended hosting providers:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://www.hostinger.com/vps-hosting"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg">🖥️</span>
              <div>
                <div className="text-sm font-medium text-foreground">Hostinger VPS</div>
                <div className="text-[11px] text-muted-foreground">From $4.99/mo · Full root access</div>
              </div>
            </a>
            <a
              href="https://railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg">🚂</span>
              <div>
                <div className="text-sm font-medium text-foreground">Railway</div>
                <div className="text-[11px] text-muted-foreground">Free tier · Auto-deploy from GitHub</div>
              </div>
            </a>
            <a
              href="https://render.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg">🌐</span>
              <div>
                <div className="text-sm font-medium text-foreground">Render</div>
                <div className="text-[11px] text-muted-foreground">Free tier · Node.js native support</div>
              </div>
            </a>
            <a
              href="https://www.digitalocean.com/products/droplets"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg">🌊</span>
              <div>
                <div className="text-sm font-medium text-foreground">DigitalOcean</div>
                <div className="text-[11px] text-muted-foreground">From $6/mo · Reliable VPS</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          {t.settings.save}
        </button>
      </div>
    </div>
  );
}
