export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">DataSphere LinkedIn Agent</h1>
        <p className="text-lg text-gray-600 mb-8">
          Gestion intelligente de vos publications LinkedIn avec IA
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="text-3xl mb-2">🤖</div>
            <h2 className="font-semibold text-gray-800">Smart Poster</h2>
            <p className="text-sm text-gray-500 mt-1">Génération automatique de posts optimisés</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="text-3xl mb-2">📊</div>
            <h2 className="font-semibold text-gray-800">Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">Suivi d&apos;engagement en temps réel</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="text-3xl mb-2">🎯</div>
            <h2 className="font-semibold text-gray-800">Mission Scout</h2>
            <p className="text-sm text-gray-500 mt-1">Analyse concurrentielle automatisée</p>
          </div>
        </div>
      </div>
    </main>
  );
}
