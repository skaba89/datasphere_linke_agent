'use client';

import { useState, useEffect } from 'react';

interface SmartPosterSettings {
  id?: string;
  maxPostsPerDay: number;
  enabled: boolean;
  scheduleHourStart: number;
  scheduleHourEnd: number;
  timezone: string;
  autoApprove: boolean;
  topics: string;
  tone: string;
  language: string;
  targetAudience: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SmartPosterSettingsView() {
  const [settings, setSettings] = useState<SmartPosterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres au montage
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/smart-poster/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch('/api/smart-poster/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-500">
        Impossible de charger les paramètres. {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            Paramètres Smart Poster
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez le nombre de posts générés par jour et les préférences de contenu
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Sauvegardé !
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Section: Posts par jour */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>📊</span> Limites quotidiennes
        </h2>

        <div className="space-y-6">
          {/* Nombre de posts par jour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de propositions de posts par jour
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setSettings({ ...settings, maxPostsPerDay: Math.max(1, settings.maxPostsPerDay - 1) })
                }
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
              >
                −
              </button>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 min-w-[80px]">
                  {settings.maxPostsPerDay}
                </div>
                <div className="text-sm text-gray-400 mt-1">posts / jour</div>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, maxPostsPerDay: Math.min(10, settings.maxPostsPerDay + 1) })
                }
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Entre 1 et 10 propositions par jour. Chaque proposition sera en attente de votre approbation.
            </p>
          </div>

          {/* Activation */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <div className="font-medium text-gray-700">Génération automatique activée</div>
              <div className="text-sm text-gray-400">
                Le worker génère des propositions aux heures programmées
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto-approve */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <div className="font-medium text-gray-700">Approbation automatique</div>
              <div className="text-sm text-gray-400">
                Les posts sont publiés automatiquement sans validation
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoApprove: !settings.autoApprove })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                settings.autoApprove ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.autoApprove ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section: Horaire */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🕐</span> Horaire de génération
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
            <select
              value={settings.scheduleHourStart}
              onChange={(e) =>
                setSettings({ ...settings, scheduleHourStart: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
            <select
              value={settings.scheduleHourEnd}
              onChange={(e) =>
                setSettings({ ...settings, scheduleHourEnd: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Le worker génère les propositions entre {String(settings.scheduleHourStart).padStart(2, '0')}:00 et{' '}
          {String(settings.scheduleHourEnd).padStart(2, '0')}:00 (fuseau : {settings.timezone})
        </p>
      </div>

      {/* Section: Contenu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>✍️</span> Préférences de contenu
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujets favoris</label>
            <input
              type="text"
              value={settings.topics}
              onChange={(e) => setSettings({ ...settings, topics: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="IA, tech, marketing, entrepreneurship..."
            />
            <p className="text-xs text-gray-400 mt-1">Séparez les sujets par des virgules</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
              <select
                value={settings.tone}
                onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="professionnel mais accessible">Professionnel mais accessible</option>
                <option value="formel et expert">Formel et expert</option>
                <option value="décontracté et humain">Décontracté et humain</option>
                <option value="inspirant et motivant">Inspiring et motivant</option>
                <option value="provocateur et débatteur">Provocateur et débatteur</option>
                <option value="éducatif et pédagogique">Éducatif et pédagogique</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="fr/en">Français / English mixte</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience cible</label>
            <input
              type="text"
              value={settings.targetAudience}
              onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="entrepreneurs, CTO, managers tech..."
            />
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
            saving
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sauvegarde en cours...
            </span>
          ) : (
            'Sauvegarder les paramètres'
          )}
        </button>
      </div>
    </div>
  );
}
