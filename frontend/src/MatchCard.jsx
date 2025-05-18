import React from 'react';
import countryEmoji from './countryEmoji';

export default function MatchCard({ game, isFav, onFav }) {
  const flag = countryEmoji(game.league);

  return (
    <div className="bg-gray-800 p-4 rounded shadow hover:bg-gray-700 transition">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{game.home} v {game.away}</h3>
        <span onClick={() => onFav(game.game_id)} className="cursor-pointer text-xl">
          {isFav ? '⭐' : '☆'}
        </span>
      </div>

      {/* ✅ Обновлённый вывод времени */}
      <p className="text-sm text-gray-400">
        {game.time_status === 'live' && game.time ? (() => {
          const start = new Date(+game.time * 1000);
          const now = new Date();
          const minutes = Math.floor((now - start) / 60000);
          const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `🔴 Идёт ${minutes} мин (с ${timeStr})`;
        })() : (
          game.start_time ? `Начало: ${game.start_time}` : 'Начало: —'
        )}
      </p>

      {game.scores && <p className="text-sm text-green-400">Счёт: {game.scores}</p>}
      <p className="text-sm text-gray-300">Турнир: {flag} {game.league}</p>
    </div>
  );
}
