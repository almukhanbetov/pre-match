import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SportMenu({ onSelect }) {
  const [sports, setSports] = useState([]);

  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await axios.get('http://localhost:8080/sports');
        setSports(res.data);
      } catch (err) {
        console.error('Ошибка загрузки видов спорта:', err);
      }
    }
    fetchSports();
  }, []);

  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium text-gray-700">Выберите вид спорта:</label>
      <select
        onChange={(e) => onSelect(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded shadow-sm focus:outline-none"
      >
        <option value="">Все</option>
        {sports.sort().map((sport, i) => (
          <option key={i} value={sport}>{sport}</option>
        ))}
      </select>
    </div>
  );
}
