"use client";

import { useState } from "react";
import { User, Bell, Shield, CreditCard, Globe, Palette } from "lucide-react";

export function SettingsPage() {
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
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences.
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

      {/* Save */}
      <div className="flex justify-end">
        <button className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
