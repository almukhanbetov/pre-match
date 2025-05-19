import React, { useEffect, useState } from 'react';
import api from './api'; // ✅ централизованный axios-инстанс
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { toast } from 'react-toastify'; // (опционально для уведомлений)

ChartJS.register(ArcElement, Tooltip, Legend);

const colors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#22c55e'
];

export default function SportStatsChart() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get('/sports/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Ошибка загрузки статистики по видам спорта:', err);
        toast.error('❌ Ошибка загрузки статистики');
      }
    }
    fetchStats();
  }, []);

  const chartData = {
    labels: stats.map((s) => s.sport),
    datasets: [
      {
        label: 'Количество матчей',
        data: stats.map((s) => s.count),
        backgroundColor: stats.map((_, i) => colors[i % colors.length]),
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="mt-10 max-w-xl mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">📊 Статистика по видам спорта</h2>
      {stats.length > 0 ? (
        <Pie data={chartData} />
      ) : (
        <p className="text-gray-400">Нет данных для отображения</p>
      )}
    </div>
  );
}
