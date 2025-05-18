import React, { useEffect, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import MatchCard from './MatchCard';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [games, setGames] = useState([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [filterType, setFilterType] = useState('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [sortBy, setSortBy] = useState('time');
  const [favorites, setFavorites] = useState(() =>
    JSON.parse(localStorage.getItem('favorites')) || []
  );
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevScores = useRef({});

  // 🔁 Только при смене вида спорта
  useEffect(() => {
    let timer;

    async function fetchGames() {
      setLoading(true);
      try {
        const url = selectedSport
          ? `http://localhost:8080/games?sport=${encodeURIComponent(selectedSport)}`
          : 'http://localhost:8080/games';
        const res = await axios.get(url);

        res.data.forEach(game => {
          if (game.time_status === 'live') {
            const prev = prevScores.current[game.game_id];
            if (prev && prev !== game.scores && game.scores) {
              toast.info(`🔔 ${game.home} vs ${game.away} — новый счёт: ${game.scores}`);
            }
            prevScores.current[game.game_id] = game.scores;
          }
        });

        setGames(res.data);
      } catch (err) {
        console.error('Ошибка загрузки матчей:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
    timer = setInterval(fetchGames, 30000); // автообновление только на смену спорта
    return () => clearInterval(timer);
  }, [selectedSport]);

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  // 🧠 useMemo для фильтрации и сортировки
  const filteredSortedGames = useMemo(() => {
    const filtered = games.filter(g => {
      const matchStatus =
        (filterType === 'live' && g.time_status === 'live') ||
        (filterType === 'prematch' && g.time_status === 'prematch') ||
        filterType === 'all';

      const matchSearch = g.league.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDateOk = !selectedDate || g.time?.startsWith(format(selectedDate, 'yyyy-MM-dd'));
      const isFav = !showOnlyFavs || favorites.includes(g.game_id);

      return matchStatus && matchSearch && matchDateOk && isFav;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'time') return new Date(a.time) - new Date(b.time);
      if (sortBy === 'score') {
        const get = s => (s ? s.split('-').reduce((a, b) => +a + +b, 0) : 0);
        return get(b.scores) - get(a.scores);
      }
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

    return sorted;
  }, [games, filterType, searchTerm, selectedDate, showOnlyFavs, sortBy, favorites]);

  const exportToExcel = () => {
    const data = filteredSortedGames.map(g => ({
      Время: g.time,
      Команды: `${g.home} vs ${g.away}`,
      Счёт: g.scores,
      Турнир: g.league,
      Спорт: g.sport,
      Статус: g.time_status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Матчи');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), 'matches.xlsx');
  };

  const exportToPNG = () => {
    const el = document.getElementById('match-container');
    html2canvas(el).then(canvas => {
      const link = document.createElement('a');
      link.download = 'matches.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  return (
    <div className="flex bg-gray-900 text-white min-h-screen">
      <Sidebar selected={selectedSport} onSelect={setSelectedSport} />
      <div className="flex-1 p-4 overflow-y-auto">
        <ToastContainer />

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterType('live')} className={`px-3 py-1 rounded ${filterType === 'live' ? 'bg-green-600' : 'bg-gray-700'}`}>Live</button>
          <button onClick={() => setFilterType('prematch')} className={`px-3 py-1 rounded ${filterType === 'prematch' ? 'bg-purple-600' : 'bg-gray-700'}`}>Предстоящие</button>
          <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded ${filterType === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}>Все</button>
          <button onClick={() => setSortBy('time')} className={`px-3 py-1 ${sortBy === 'time' ? 'bg-blue-500' : 'bg-gray-700'}`}>⏱ Время</button>
          <button onClick={() => setSortBy('score')} className={`px-3 py-1 ${sortBy === 'score' ? 'bg-yellow-600' : 'bg-gray-700'}`}>⚽ Счёт</button>
          <button onClick={() => setSortBy('rating')} className={`px-3 py-1 ${sortBy === 'rating' ? 'bg-red-600' : 'bg-gray-700'}`}>📈 Рейтинг</button>
          <button onClick={exportToExcel} className="px-3 py-1 bg-green-700 rounded">📊 Excel</button>
          <button onClick={exportToPNG} className="px-3 py-1 bg-gray-600 rounded">📸 PNG</button>
          <button onClick={() => setShowOnlyFavs(!showOnlyFavs)} className="px-3 py-1 bg-yellow-500 rounded">
            {showOnlyFavs ? 'Все' : '⭐ Избранные'}
          </button>
        </div>

        <input
          type="text"
          placeholder="Поиск по турниру..."
          className="px-4 py-2 mb-4 w-full bg-gray-700 text-white rounded"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <DatePicker
          selected={selectedDate}
          onChange={setSelectedDate}
          dateFormat="yyyy-MM-dd"
          placeholderText="Выберите дату"
          className="px-4 py-2 mb-4 bg-gray-700 text-white rounded"
        />

        {loading && (
          <p className="text-center text-gray-400 mb-4">Загрузка матчей...</p>
        )}

        <div id="match-container" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSortedGames.map((g, i) => (
            <MatchCard key={`${g.game_id}_${i}`} game={g} isFav={favorites.includes(g.game_id)} onFav={toggleFavorite} />
          ))}
        </div>
      </div>
    </div>
  );
}
