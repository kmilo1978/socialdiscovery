"use client";

import { Download, FileSpreadsheet, FileText, File, Clock, CheckCircle, Trash2 } from "lucide-react";

const exportsData = [
  { id: 1, name: "LinkedIn_SaaS_Founders_Oct24.csv", format: "CSV", records: 1245, size: "2.4 MB", status: "Ready", date: "Oct 24, 2:45 PM" },
  { id: 2, name: "Twitter_AI_Startups_Oct24.xlsx", format: "XLSX", records: 842, size: "1.8 MB", status: "Ready", date: "Oct 24, 1:20 PM" },
  { id: 3, name: "Facebook_Marketing_Oct23.csv", format: "CSV", records: 2109, size: "4.1 MB", status: "Ready", date: "Oct 23, 11:35 AM" },
  { id: 4, name: "Instagram_Hashtag_SaaS.json", format: "JSON", records: 3521, size: "6.7 MB", status: "Processing", date: "Oct 22, 4:25 PM" },
  { id: 5, name: "YouTube_Crypto_Oct21.csv", format: "CSV", records: 1890, size: "3.6 MB", status: "Ready", date: "Oct 21, 10:35 AM" },
];

const getFormatIcon = (format: string) => {
  switch (format) {
    case "CSV":
      return <FileSpreadsheet size={16} className="text-success" />;
    case "XLSX":
      return <FileSpreadsheet size={16} className="text-primary" />;
    case "JSON":
      return <FileText size={16} className="text-warning" />;
    default:
      return <File size={16} className="text-muted-foreground" />;
  }
};

export function ExportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Exports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download your exported data files.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Storage: 18.6 MB / 1 GB
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Exports</div>
          <div className="text-2xl font-bold text-foreground">47</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Records</div>
          <div className="text-2xl font-bold text-foreground">124.5k</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Storage Used</div>
          <div className="text-2xl font-bold text-foreground">18.6 MB</div>
        </div>
      </div>

      {/* Exports Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">File</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Format</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Records</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exportsData.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {getFormatIcon(item.format)}
                    <span className="text-sm text-foreground font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-md bg-secondary text-foreground">{item.format}</span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{item.records.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.size}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    item.status === "Ready" ? "text-success" : "text-primary"
                  }`}>
                    {item.status === "Ready" ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {item.status === "Ready" && (
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                        <Download size={14} />
                      </button>
                    )}
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-white/5 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
