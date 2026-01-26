'use client';

import Link from 'next/link';
import { useState, memo } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            BaseVitale - Interface de Test
          </h1>
          <p className="text-xl text-gray-600">
            Testez tous les modules du système BaseVitale
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Module C+ - Identity */}
          <ModuleCard
            title="Module C+ - Identité"
            description="Gestion des patients (INS, recherche, création)"
            href="/identity"
            color="blue"
          />

          {/* Module S - Scribe */}
          <ModuleCard
            title="Module S - Scribe"
            description="Analyse IA, états de chargement, validation visuelle (symptômes, diagnostics, JSON)"
            href="/scribe"
            color="green"
          />

          {/* Module B+ - Coding */}
          <ModuleCard
            title="Module B+ - Codage"
            description="Suggestions de codes CIM-10/11"
            href="/coding"
            color="purple"
          />

          {/* Module E+ - Billing */}
          <ModuleCard
            title="Module E+ - Facturation"
            description="Création et validation d'événements de facturation"
            href="/billing"
            color="orange"
          />

          {/* Knowledge Graph */}
          <ModuleCard
            title="Knowledge Graph"
            description="Gestion du graphe de connaissances sémantique"
            href="/knowledge-graph"
            color="indigo"
          />

          {/* Module L - Feedback */}
          <ModuleCard
            title="Module L - Feedback"
            description="Corrections et apprentissage du système"
            href="/feedback"
            color="pink"
          />

          {/* Health & Metrics */}
          <ModuleCard
            title="Health & Métriques"
            description="Santé de l'application et métriques de performance"
            href="/health"
            color="teal"
          />

          {/* Monitoring Temps Réel */}
          <ModuleCard
            title="Monitoring Temps Réel"
            description="Alertes, Code Rouge et surveillance en direct"
            href="/monitoring"
            color="red"
          />

          {/* PACS - DICOM Viewer */}
          <ModuleCard
            title="PACS - DICOM Viewer"
            description="Visualisation des images médicales DICOM"
            href="/pacs"
            color="cyan"
          />

          {/* DPI */}
          <ModuleCard
            title="DPI - Dossier Patient"
            description="Dossier Patient Informatisé complet et centralisé"
            href="/dpi"
            color="indigo"
          />

          {/* Agenda */}
          <ModuleCard
            title="Agenda Rendez-vous"
            description="Gestion des rendez-vous avec rappels automatiques"
            href="/appointments"
            color="emerald"
          />

          {/* Messagerie */}
          <ModuleCard
            title="Messagerie Interne"
            description="Communication sécurisée entre membres de l'équipe"
            href="/messaging"
            color="purple"
          />

          {/* ERP RH */}
          <ModuleCard
            title="ERP RH - Équipes"
            description="Gestion du personnel, planning et congés"
            href="/staff"
            color="amber"
          />

          {/* Stocks */}
          <ModuleCard
            title="Gestion Stocks"
            description="Gestion des stocks pharmacie et matériel médical"
            href="/inventory"
            color="rose"
          />

          {/* Analytics */}
          <ModuleCard
            title="Dashboard Analytics"
            description="Métriques, statistiques et monitoring avancé"
            href="/analytics"
            color="violet"
          />
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              API Base URL
            </h2>
            <p className="text-gray-600 font-mono">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant optimisé avec React.memo pour éviter les re-renders inutiles
const ModuleCard = memo(function ModuleCard({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    pink: 'bg-pink-500 hover:bg-pink-600',
    teal: 'bg-teal-500 hover:bg-teal-600',
    red: 'bg-red-500 hover:bg-red-600',
    cyan: 'bg-cyan-500 hover:bg-cyan-600',
    emerald: 'bg-emerald-500 hover:bg-emerald-600',
    amber: 'bg-amber-500 hover:bg-amber-600',
    rose: 'bg-rose-500 hover:bg-rose-600',
    violet: 'bg-violet-500 hover:bg-violet-600',
  };

  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
    >
      <div className={`w-12 h-12 ${colorClasses[color] || 'bg-gray-500'} rounded-lg flex items-center justify-center mb-4`}>
        <span className="text-white text-2xl font-bold">
          {title.charAt(0)}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
});
