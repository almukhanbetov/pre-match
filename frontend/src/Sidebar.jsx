import React, { useEffect, useState } from 'react';
import api from './api'; // ✅ подключаем централизованный API
import sportIcon from './sportIcon';
import { toast } from 'react-toastify'; // для уведомлений об ошибках

export default function Sidebar({ selected, onSelect }) {
  const [sports, setSports] = useState([]);

  useEffect(() => {
    api.get('/sports')
      .then(res => setSports(res.data))
      .catch(err => {
        console.error('❌ Ошибка загрузки видов спорта:', err);
        toast.error('❌ Ошибка загрузки видов спорта');
      });
  }, []);

  return (
    <div className="hidden md:block w-56 bg-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">Спорт</h2>
      <ul className="space-y-2">
        {sports.map((sport, i) => (
          <li
            key={i}
            onClick={() => onSelect(sport)}
            className={`flex items-center gap-2 cursor-pointer hover:text-green-400 ${
              sport === selected ? 'text-green-400 font-bold' : ''
            }`}
          >
            <span>{sportIcon(sport)}</span>
            {sport}
          </li>
        ))}
      </ul>
    </div>
  );
}
