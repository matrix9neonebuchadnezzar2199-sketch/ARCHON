import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchJSON } from "@/lib/api";
import { Settings, Save, RefreshCw } from "lucide-react";
import type { ArchonConfig } from "@/types";

type ModelRow = { display_name: string; model_name: string; provider: string };

export default function SettingsPage() {
  const [config, setConfig] = useState<ArchonConfig | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    llm_provider: "",
    deep_think_llm: "",
    quick_think_llm: "",
    guru_llm: "",
    output_language: "",
    max_invest_debate_rounds: 2,
    max_risk_debate_rounds: 2,
  });

  const loadConfig = async () => {
    const { config: c } = await fetchJSON<{ config: ArchonConfig }>("/api/archon/settings");
    setConfig(c);
    setEditValues({
      llm_provider: c.llm_provider || "",
      deep_think_llm: c.deep_think_llm || "",
      quick_think_llm: c.quick_think_llm || "",
      guru_llm: c.guru_llm || "",
      output_language: c.output_language || "",
      max_invest_debate_rounds: c.max_invest_debate_rounds ?? 2,
      max_risk_debate_rounds: c.max_risk_debate_rounds ?? 2,
    });
  };

  const loadModels = async () => {
    const data = await fetchJSON<{
      models: ModelRow[];
    }>("/api/archon/settings/models");
    setModels(data.models || []);
  };

  useEffect(() => {
    void loadConfig().catch(console.error);
    void loadModels().catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/archon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editValues,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await loadConfig();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Settings className="h-8 w-8 text-archon-500" />
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">ARCHON system configuration (in-process)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">LLM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="LLM provider"
              value={editValues.llm_provider}
              onChange={(v) => {
                setEditValues((prev) => ({ ...prev, llm_provider: v }));
              }}
            />
            <Field
              label="Output language"
              value={editValues.output_language}
              onChange={(v) => {
                setEditValues((prev) => ({ ...prev, output_language: v }));
              }}
            />
            <Field
              label="Deep think model"
              value={editValues.deep_think_llm}
              onChange={(v) => {
                setEditValues((prev) => ({ ...prev, deep_think_llm: v }));
              }}
            />
            <Field
              label="Quick think model"
              value={editValues.quick_think_llm}
              onChange={(v) => {
                setEditValues((prev) => ({ ...prev, quick_think_llm: v }));
              }}
            />
            <Field
              label="Guru model"
              value={editValues.guru_llm}
              onChange={(v) => {
                setEditValues((prev) => ({ ...prev, guru_llm: v }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Invest debate rounds"
              value={String(editValues.max_invest_debate_rounds)}
              onChange={(v) => {
                setEditValues((prev) => ({
                  ...prev,
                  max_invest_debate_rounds: parseInt(v, 10) || 1,
                }));
              }}
            />
            <Field
              label="Risk debate rounds"
              value={String(editValues.max_risk_debate_rounds)}
              onChange={(v) => {
                setEditValues((prev) => ({
                  ...prev,
                  max_risk_debate_rounds: parseInt(v, 10) || 1,
                }));
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-archon-500 hover:bg-archon-600"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadConfig();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available models ({models.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <Badge key={m.model_name} variant="outline" className="text-xs">
                {m.display_name}{" "}
                <span className="ml-1 text-muted-foreground">({m.provider})</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {config?.enabled_gurus && config.enabled_gurus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enabled gurus ({config.enabled_gurus.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {config.enabled_gurus.map((g) => (
                <Badge key={g} variant="outline" className="text-xs capitalize">
                  {g.replaceAll("_", " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
